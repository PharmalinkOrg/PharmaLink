// File: backend/controllers/superadminReportsController.js
//
// GET /api/superadmin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=day|week|month
//
// Dates are Philippine calendar days (Asia/Manila), inclusive.
// Each section is computed independently: if one table can't be
// read, that section is returned as null and the rest still load.

const supabaseAdmin = require('../config/supabaseAdmin')
const fetchAll = require('../utils/fetchAll')

/* ============================================================
   DATES
============================================================ */

const TIME_ZONE = 'Asia/Manila'
const UTC_OFFSET = '+08:00'
const MAX_RANGE_DAYS = 731
const INTERVALS = ['day', 'week', 'month']

const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Any timestamp -> 'YYYY-MM-DD' in Manila time.
const toManilaDateKey = (value) => manilaDateFormatter.format(new Date(value))

const isDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Monday of the week containing dateKey.
const weekStartKey = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

const periodKey = (timestamp, interval) => {
  const dateKey = toManilaDateKey(timestamp)

  if (interval === 'month') return dateKey.slice(0, 7)
  if (interval === 'week') return weekStartKey(dateKey)
  return dateKey
}

function parseRange(query) {
  const today = toManilaDateKey(new Date())
  const to = query.to || today
  const from = query.from

  if (!isDateKey(from) || !isDateKey(to)) {
    return { error: 'from and to must be dates in YYYY-MM-DD format' }
  }

  const days = (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000

  if (days < 0) {
    return { error: 'from must be on or before to' }
  }

  if (days > MAX_RANGE_DAYS) {
    return { error: 'Choose a range of two years or less' }
  }

  const interval = INTERVALS.includes(query.interval)
    ? query.interval
    : days <= 31
      ? 'day'
      : days <= 180
        ? 'week'
        : 'month'

  return {
    from,
    to,
    interval,
    startIso: `${from}T00:00:00${UTC_OFFSET}`,
    endIso: `${to}T23:59:59.999${UTC_OFFSET}`,
  }
}

/* ============================================================
   AGGREGATION HELPERS
============================================================ */

const upper = (value) => String(value || 'UNKNOWN').trim().toUpperCase()

function countByStatus(rows) {
  return rows.reduce((counts, row) => {
    const status = upper(row.status)
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
}

/**
 * Groups rows into periods. valueOf(row) defaults to 1 (a count).
 * Returns [{ period, [valueKey]: number }] for non-empty periods.
 */
function buildSeries(rows, getDate, interval, valueKey = 'count', valueOf = () => 1) {
  const totals = new Map()

  rows.forEach((row) => {
    const date = getDate(row)

    if (!date) return

    const key = periodKey(date, interval)
    totals.set(key, (totals.get(key) || 0) + valueOf(row))
  })

  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      [valueKey]: valueKey === 'amount' ? Number(value.toFixed(2)) : value,
    }))
}

const inRange = (timestamp, range) => {
  if (!timestamp) return false
  const key = toManilaDateKey(timestamp)
  return key >= range.from && key <= range.to
}

async function section(name, compute) {
  try {
    return await compute()
  } catch (error) {
    console.warn(`Report section "${name}" unavailable:`, error.message || error)
    return null
  }
}

/* ============================================================
   SECTIONS
============================================================ */

async function usersSection(range) {
  const users = await fetchAll(() =>
    supabaseAdmin
      .from('users')
      .select('role, created_at')
      .in('role', ['CUSTOMER', 'PHARMACY_ADMIN'])
  )

  const newUsers = users.filter((user) => inRange(user.created_at, range))

  return {
    total: users.length,
    customers: users.filter((user) => user.role === 'CUSTOMER').length,
    pharmacyAdmins: users.filter((user) => user.role === 'PHARMACY_ADMIN').length,
    newInRange: newUsers.length,
    series: buildSeries(newUsers, (user) => user.created_at, range.interval),
  }
}

async function pharmaciesSection(range) {
  const pharmacies = await fetchAll(() =>
    supabaseAdmin.from('pharmacies').select('status, created_at')
  )

  return {
    total: pharmacies.length,
    byStatus: countByStatus(pharmacies),
    newInRange: pharmacies.filter((pharmacy) => inRange(pharmacy.created_at, range)).length,
  }
}

async function reservationsSection(range) {
  const reservations = await fetchAll(() =>
    supabaseAdmin
      .from('reservations')
      .select('status, created_at')
      .gte('created_at', range.startIso)
      .lte('created_at', range.endIso)
  )

  return {
    total: reservations.length,
    byStatus: countByStatus(reservations),
    series: buildSeries(reservations, (row) => row.created_at, range.interval),
  }
}

async function salesSection(range) {
  const sales = await fetchAll(() =>
    supabaseAdmin
      .from('sales')
      .select('pharmacy_id, total_amount, sale_date, created_at')
      .eq('status', 'COMPLETED')
      .gte('sale_date', range.startIso)
      .lte('sale_date', range.endIso)
  )

  const amountOf = (sale) => Number(sale.total_amount) || 0
  const totalAmount = sales.reduce((sum, sale) => sum + amountOf(sale), 0)

  const byPharmacy = new Map()

  sales.forEach((sale) => {
    byPharmacy.set(sale.pharmacy_id, (byPharmacy.get(sale.pharmacy_id) || 0) + amountOf(sale))
  })

  const topIds = [...byPharmacy]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  let names = new Map()

  if (topIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('pharmacies')
      .select('pharmacy_id, name')
      .in('pharmacy_id', topIds.map(([id]) => id))

    names = new Map((data || []).map((pharmacy) => [pharmacy.pharmacy_id, pharmacy.name]))
  }

  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    transactions: sales.length,
    series: buildSeries(
      sales,
      (sale) => sale.sale_date || sale.created_at,
      range.interval,
      'amount',
      amountOf
    ),
    topPharmacies: topIds.map(([id, amount]) => ({
      name: names.get(id) || `Pharmacy #${id}`,
      amount: Number(amount.toFixed(2)),
    })),
  }
}

async function prescriptionsSection(range) {
  const prescriptions = await fetchAll(() =>
    supabaseAdmin
      .from('prescriptions')
      .select('status, created_at')
      .gte('created_at', range.startIso)
      .lte('created_at', range.endIso)
  )

  return {
    total: prescriptions.length,
    byStatus: countByStatus(prescriptions),
  }
}

/**
 * The medicine_requests columns weren't shared, so the requested
 * medicine's name is read from the most likely columns, falling
 * back to a lookup by medicine_id.
 */
async function medicineRequestsSection(range) {
  const requests = await fetchAll(() =>
    supabaseAdmin
      .from('medicine_requests')
      .select('*')
      .gte('created_at', range.startIso)
      .lte('created_at', range.endIso)
  )

  const directName = (row) =>
    [row.medicine_name, row.requested_medicine_name, row.requested_medicine, row.generic_name]
      .find((value) => typeof value === 'string' && value.trim())
      ?.trim()

  const missingIds = [
    ...new Set(
      requests
        .filter((row) => !directName(row) && row.medicine_id)
        .map((row) => row.medicine_id)
    ),
  ]

  let medicineNames = new Map()

  if (missingIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('medicines')
      .select('medicine_id, generic_name, brand_name, dosage')
      .in('medicine_id', missingIds)

    medicineNames = new Map(
      (data || []).map((medicine) => [
        medicine.medicine_id,
        [medicine.generic_name, medicine.dosage].filter(Boolean).join(' '),
      ])
    )
  }

  const counts = new Map()

  requests.forEach((row) => {
    const rawName = directName(row) || medicineNames.get(row.medicine_id)

    if (!rawName) return

    const key = rawName.toLowerCase().replace(/\s+/g, ' ')
    const entry = counts.get(key) || { name: rawName, count: 0 }
    entry.count += 1
    counts.set(key, entry)
  })

  return {
    total: requests.length,
    byStatus: countByStatus(requests),
    topMedicines: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8),
  }
}

/* ============================================================
   HANDLER
============================================================ */

const getReportSummary = async (req, res) => {
  try {
    const range = parseRange(req.query)

    if (range.error) {
      return res.status(400).json({ success: false, message: range.error })
    }

    const [users, pharmacies, reservations, sales, prescriptions, medicineRequests] =
      await Promise.all([
        section('users', () => usersSection(range)),
        section('pharmacies', () => pharmaciesSection(range)),
        section('reservations', () => reservationsSection(range)),
        section('sales', () => salesSection(range)),
        section('prescriptions', () => prescriptionsSection(range)),
        section('medicineRequests', () => medicineRequestsSection(range)),
      ])

    return res.status(200).json({
      success: true,
      data: {
        range: { from: range.from, to: range.to, interval: range.interval, timeZone: TIME_ZONE },
        users,
        pharmacies,
        reservations,
        sales,
        prescriptions,
        medicineRequests,
      },
    })
  } catch (error) {
    console.error('Report summary server error:', error)
    return res.status(500).json({ success: false, message: 'Failed to build report' })
  }
}

module.exports = {
  getReportSummary,
  // exported for tests
  _internal: { parseRange, periodKey, toManilaDateKey, buildSeries },
}
