// File: admin-web/src/hooks/usePharmacyDashboard.js
//
// Loads everything the pharmacy dashboard needs from existing
// endpoints (in parallel) and derives the numbers it shows.
// One failing endpoint doesn't break the others.

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'

const DAY_MS = 24 * 60 * 60 * 1000

export const EXPIRY_WINDOW_DAYS = 30

// =========================================================
// SMALL HELPERS
// =========================================================

function toArray(value) {
  return Array.isArray(value) ? value : []
}

/** Local calendar day, e.g. "2026-10-07". */
export function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : null
}

function timeOnly(value) {
  return value ? String(value).slice(0, 5) : ''
}

/** Days from today until a YYYY-MM-DD date (negative = past). */
function daysUntil(value) {
  const key = dateOnly(value)

  if (!key) return null

  const date = new Date(`${key}T00:00:00`)

  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.round((date - today) / DAY_MS)
}

function batchStatus(batch) {
  if (batch?.status) return batch.status

  const quantity = Number(batch?.quantity) || 0
  const reorder = Number(batch?.reorder_level) || 0

  if (quantity <= 0) return 'OUT_OF_STOCK'
  if (quantity <= reorder) return 'LOW_STOCK'

  return 'AVAILABLE'
}

function formatDosage(medicine) {
  const text = String(medicine?.dosage ?? '').trim()

  if (!text) return ''

  const unit = medicine?.dosage_unit

  if (!unit || /[a-z%]/i.test(text)) return text

  return `${text} ${unit}`
}

function percentChange(current, previous) {
  if (!previous) return null

  return Math.round(((current - previous) / previous) * 100)
}

// =========================================================
// DAILY SERIES (reservations per day, for the chart)
// =========================================================

export function buildDailySeries(reservations = [], days = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)

    buckets.push({
      key: localDayKey(date),
      label:
        days <= 7
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
      tooltip: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      count: 0,
    })
  }

  const indexByKey = new Map(
    buckets.map((bucket, index) => [bucket.key, index])
  )

  reservations.forEach((reservation) => {
    const index = indexByKey.get(
      localDayKey(reservation.created_at)
    )

    if (index !== undefined) buckets[index].count += 1
  })

  return buckets
}

// =========================================================
// INSIGHTS
// =========================================================

export function buildInsights(data, pharmacyId) {
  if (!data) return null

  const now = Date.now()
  const todayKey = localDayKey(new Date())
  const nowTime = new Date().toTimeString().slice(0, 5)

  const summary = data.summary || null
  const reservations = toArray(data.reservations)
  const requests = toArray(data.requests)
  const inventory = toArray(data.inventory)
  const medicines = toArray(data.medicines)

  const has = {
    summary: Boolean(summary),
    reservations: Array.isArray(data.reservations),
    requests: Array.isArray(data.requests),
    inventory: Array.isArray(data.inventory),
    medicines: Array.isArray(data.medicines),
  }

  // ---------------- Reservations ----------------

  const byPickupTime = (a, b) =>
    timeOnly(a.pickup_time).localeCompare(timeOnly(b.pickup_time))

  const pending = reservations.filter(
    (reservation) => reservation.status === 'PENDING'
  )

  const nextPendingPickup =
    pending
      .filter(
        (reservation) =>
          dateOnly(reservation.pickup_date) === todayKey
      )
      .sort(byPickupTime)[0] || null

  const todaysPickups = reservations
    .filter(
      (reservation) =>
        dateOnly(reservation.pickup_date) === todayKey &&
        !['CANCELLED', 'EXPIRED'].includes(reservation.status)
    )
    .sort(byPickupTime)
    .map((reservation) => ({
      ...reservation,
      isLate:
        ['PENDING', 'CONFIRMED'].includes(reservation.status) &&
        timeOnly(reservation.pickup_time) !== '' &&
        timeOnly(reservation.pickup_time) < nowTime,
    }))

  const completedAt = (reservation) =>
    reservation.completed_at || reservation.updated_at

  const completedIn = (fromDaysAgo, toDaysAgo) =>
    reservations.filter((reservation) => {
      if (reservation.status !== 'COMPLETED') return false

      const age = now - new Date(completedAt(reservation)).getTime()

      return age >= toDaysAgo * DAY_MS && age < fromDaysAgo * DAY_MS
    }).length

  const completedLast7 = completedIn(7, 0)
  const completedPrevious7 = completedIn(14, 7)

  // ---------------- Medicine requests ----------------

  const myId = String(pharmacyId)

  const myResponse = (request) =>
    toArray(request.medicine_request_responses).find(
      (response) => String(response.pharmacy_id) === myId
    )

  const awaiting = requests.filter(
    (request) => request.status === 'OPEN' && !myResponse(request)
  )

  const oldestAwaitingAt = awaiting.reduce(
    (oldest, request) =>
      !oldest || new Date(request.created_at) < new Date(oldest)
        ? request.created_at
        : oldest,
    null
  )

  const recentRequests = requests.filter(
    (request) =>
      now - new Date(request.created_at).getTime() < 30 * DAY_MS
  )

  const answeredRecent = recentRequests.filter((request) =>
    myResponse(request)
  ).length

  const responseRate = recentRequests.length
    ? Math.round((answeredRecent / recentRequests.length) * 100)
    : null

  // ---------------- Inventory ----------------

  const outOfStock = inventory.filter(
    (batch) => batchStatus(batch) === 'OUT_OF_STOCK'
  )

  const lowStock = inventory.filter(
    (batch) => batchStatus(batch) === 'LOW_STOCK'
  )

  const expiring = inventory.filter((batch) => {
    const days = daysUntil(batch.expiration_date)

    return (
      (Number(batch.quantity) || 0) > 0 &&
      days !== null &&
      days <= EXPIRY_WINDOW_DAYS
    )
  })

  const expired = expiring.filter(
    (batch) => daysUntil(batch.expiration_date) < 0
  )

  // ---------------- Stock watchlist ----------------

  const medicineById = new Map(
    medicines.map((medicine) => [
      String(medicine.medicine_id),
      medicine,
    ])
  )

  const watchlist = inventory
    .map((batch) => {
      const status = batchStatus(batch)
      const quantity = Number(batch.quantity) || 0
      const days = daysUntil(batch.expiration_date)
      const flags = []

      if (status === 'OUT_OF_STOCK') {
        flags.push({ tone: 'danger', label: 'Out of stock', weight: 0 })
      } else if (status === 'LOW_STOCK') {
        flags.push({ tone: 'warning', label: 'Low stock', weight: 2 })
      }

      if (quantity > 0 && days !== null) {
        if (days < 0) {
          flags.push({ tone: 'danger', label: 'Expired', weight: 1 })
        } else if (days <= EXPIRY_WINDOW_DAYS) {
          flags.push({
            tone: 'warning',
            label: days === 0 ? 'Expires today' : `Expires in ${days}d`,
            weight: 3 + days / 100,
          })
        }
      }

      if (flags.length === 0) return null

      const medicine = medicineById.get(String(batch.medicine_id))

      const name =
        medicine?.generic_name ||
        medicine?.brand_name ||
        `Medicine #${batch.medicine_id}`

      const detail = [
        medicine?.brand_name &&
        medicine.brand_name !== medicine.generic_name
          ? medicine.brand_name
          : null,
        formatDosage(medicine),
      ]
        .filter(Boolean)
        .join(' · ')

      return {
        id: batch.inventory_id,
        name,
        detail,
        batch: batch.batch_number,
        quantity,
        reorderLevel: batch.reorder_level,
        flags,
        weight: Math.min(...flags.map((flag) => flag.weight)),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.weight - b.weight || a.quantity - b.quantity)

  // ---------------- Result ----------------
  // Fall back to the /dashboard summary when a list failed.

  return {
    has,

    pendingCount: has.reservations
      ? pending.length
      : summary?.pendingReservations ?? null,
    nextPendingPickup,
    todaysPickups,
    completedLast7: has.reservations ? completedLast7 : null,
    completedChange: has.reservations
      ? percentChange(completedLast7, completedPrevious7)
      : null,

    awaitingCount: has.requests ? awaiting.length : null,
    oldestAwaitingAt,
    responseRate: has.requests ? responseRate : null,
    recentRequestCount: recentRequests.length,

    batchCount: has.inventory
      ? inventory.length
      : summary?.totalInventory ?? null,
    lowCount: has.inventory
      ? lowStock.length
      : summary?.lowStock ?? null,
    outCount: has.inventory
      ? outOfStock.length
      : summary?.outOfStock ?? null,
    expiringCount: has.inventory ? expiring.length : null,
    expiredCount: has.inventory ? expired.length : null,

    watchlist: watchlist.slice(0, 6),
    watchlistTotal: watchlist.length,

    medicineCount: has.medicines
      ? medicines.length
      : summary?.totalMedicines ?? null,
    activeMedicineCount: has.medicines
      ? medicines.filter(
          (medicine) => !medicine.status || medicine.status === 'ACTIVE'
        ).length
      : summary?.totalMedicines ?? null,
  }
}

// =========================================================
// HOOK
// =========================================================

const SOURCES = (pharmacyId) => ({
  summary: `/dashboard/${pharmacyId}`,
  reservations: '/reservations/pharmacy',
  requests: '/medicine-requests/pharmacy',
  inventory: `/pharmacies/${pharmacyId}/inventory`,
  medicines: `/medicines?pharmacy_id=${pharmacyId}`,
})

/**
 * const { data, errors, initialLoading, refreshing,
 *         lastUpdated, refetch } = usePharmacyDashboard({...})
 */
export function usePharmacyDashboard({
  token,
  pharmacyId,
  refreshInterval = 60000,
}) {
  const [data, setData] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!token || !pharmacyId) return

    setLoading(true)

    const sources = SOURCES(pharmacyId)
    const keys = Object.keys(sources)

    const results = await Promise.allSettled(
      keys.map((key) => apiRequest(sources[key], { token }))
    )

    if (!isMounted.current) return

    setData((previous) => {
      const next = { ...(previous || {}) }

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          next[keys[index]] = result.value?.data ?? null
        }
      })

      return next
    })

    setErrors(() => {
      const next = {}

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          next[keys[index]] =
            result.reason?.message || 'Could not load'
        }
      })

      return next
    })

    setLastUpdated(new Date())
    setLoading(false)
  }, [token, pharmacyId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return undefined

    const interval = setInterval(load, refreshInterval)

    return () => clearInterval(interval)
  }, [load, refreshInterval])

  return {
    data,
    errors,
    initialLoading: loading && data === null,
    refreshing: loading && data !== null,
    lastUpdated,
    refetch: load,
  }
}