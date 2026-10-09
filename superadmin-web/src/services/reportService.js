// File: superadmin-web/src/services/reportService.js
//
// System reports for the Super Admin.
//
// Server endpoint (preferred):
//   GET /api/superadmin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=day|week|month
//
// Until that endpoint exists, a partial report is built in the
// browser from the users and pharmacies lists, so the page is
// useful right away. Reservation, request, prescription and sales
// sections show "not available yet" in that mode.

import { apiRequest } from './apiClient'
import { getPharmacies } from './pharmacyService'
import { getAllSuperAdminUsers } from './userService'

/* ============================================================
   DATE BUCKETS
============================================================ */

const DAY_MS = 24 * 60 * 60 * 1000

export function chooseInterval(from, to) {
  const days = Math.round((to - from) / DAY_MS) + 1

  if (days <= 31) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

// YYYY-MM-DD in the given time zone.
export function toDateKey(date, timeZone) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone })
}

function startOfWeekKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  const weekday = (date.getUTCDay() + 6) % 7 // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday)
  return date.toISOString().slice(0, 10)
}

export function periodKey(date, interval, timeZone) {
  const dayKey = toDateKey(date, timeZone)

  if (interval === 'month') return dayKey.slice(0, 7)
  if (interval === 'week') return startOfWeekKey(dayKey)
  return dayKey
}

export function buildPeriods(fromKey, toKey, interval) {
  const periods = []
  const seen = new Set()
  const cursor = new Date(`${fromKey}T00:00:00Z`)
  const end = new Date(`${toKey}T00:00:00Z`)

  while (cursor <= end) {
    const dayKey = cursor.toISOString().slice(0, 10)
    const key =
      interval === 'month'
        ? dayKey.slice(0, 7)
        : interval === 'week'
          ? startOfWeekKey(dayKey)
          : dayKey

    if (!seen.has(key)) {
      seen.add(key)
      periods.push(key)
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return periods
}

export function formatPeriodLabel(key, interval) {
  if (interval === 'month') {
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const label = new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return interval === 'week' ? `Week of ${label}` : label
}

/* ============================================================
   SERVER REPORT
============================================================ */

async function getServerReport({ fromKey, toKey, interval }) {
  const result = await apiRequest('/superadmin/reports/summary', {
    query: { from: fromKey, to: toKey, interval },
  })

  return result.data || {}
}

/* ============================================================
   PARTIAL REPORT (browser-side fallback)
============================================================ */

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || 'UNKNOWN'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

async function buildPartialReport({ fromKey, toKey, interval, timeZone }) {
  const [users, pharmacies] = await Promise.all([getAllSuperAdminUsers(), getPharmacies()])

  const inRange = (date) => {
    if (!date) return false
    const key = toDateKey(date, timeZone)
    return key >= fromKey && key <= toKey
  }

  const nonAdminUsers = users.filter((user) => normalizeKey(user.role) !== 'SUPER_ADMIN')
  const usersWithDates = nonAdminUsers.some((user) => user.created_at)
  const newUsers = nonAdminUsers.filter((user) => inRange(user.created_at))

  const seriesCounts = countBy(newUsers, (user) =>
    periodKey(user.created_at, interval, timeZone)
  )

  const pharmacyList = Array.isArray(pharmacies) ? pharmacies : []

  return {
    users: {
      total: nonAdminUsers.length,
      customers: nonAdminUsers.filter((u) => normalizeKey(u.role) === 'CUSTOMER').length,
      pharmacyAdmins: nonAdminUsers.filter((u) => normalizeKey(u.role) === 'PHARMACY_ADMIN').length,
      newInRange: usersWithDates ? newUsers.length : null,
      series: usersWithDates
        ? buildPeriods(fromKey, toKey, interval).map((period) => ({
            period,
            count: seriesCounts[period] || 0,
          }))
        : null,
    },

    pharmacies: {
      total: pharmacyList.length,
      byStatus: countBy(pharmacyList, (pharmacy) => normalizeKey(pharmacy.status)),
      newInRange: pharmacyList.filter((pharmacy) => inRange(pharmacy.created_at)).length,
    },

    reservations: null,
    medicineRequests: null,
    prescriptions: null,
    sales: null,
  }
}

/* ============================================================
   PUBLIC
============================================================ */

/**
 * Returns { report, source } where source is 'server' or
 * 'partial' (endpoint not on the server yet).
 */
export async function getReportSummary({ fromKey, toKey, interval, timeZone }) {
  try {
    return {
      report: await getServerReport({ fromKey, toKey, interval }),
      source: 'server',
    }
  } catch (error) {
    if (error.status !== 404) {
      throw error
    }

    return {
      report: await buildPartialReport({ fromKey, toKey, interval, timeZone }),
      source: 'partial',
    }
  }
}
