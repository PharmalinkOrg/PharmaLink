// File: superadmin-web/src/hooks/useRequestInsights.js
// Description: Loads all medicine requests (real data) and derives
// the numbers the dashboard needs: unanswered requests, response
// rate, daily trend and unmet demand.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMedicineRequests } from '../services/superadminDashboardServices'

const DAY_MS = 24 * 60 * 60 * 1000

// A pharmacy response with one of these statuses means the
// medicine was found for the customer.
const FOUND_STATUSES = ['AVAILABLE', 'PARTIALLY_AVAILABLE']

// =========================================================
// HELPERS
// =========================================================

function getResponses(request) {
  return Array.isArray(request?.medicine_request_responses)
    ? request.medicine_request_responses
    : []
}

function getItems(request) {
  return Array.isArray(request?.medicine_request_items)
    ? request.medicine_request_items
    : []
}

/** Local calendar day key, e.g. "2026-10-07". */
function dayKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getItemName(item) {
  const generic =
    item?.medicine_name ||
    item?.medicines?.generic_name ||
    ''

  const brand =
    item?.brand_name ||
    item?.medicines?.brand_name ||
    ''

  const dosage =
    item?.dosage ||
    item?.medicines?.dosage ||
    ''

  const base =
    brand && generic && brand.toLowerCase() !== generic.toLowerCase()
      ? `${brand} (${generic})`
      : brand || generic || 'Unnamed medicine'

  return dosage ? `${base} ${dosage}` : base
}

function percent(part, whole) {
  if (!whole) return null

  return Math.round((part / whole) * 100)
}

// =========================================================
// DAILY SERIES (used by the trend chart)
// =========================================================

/**
 * Count requests created per day for the last `days` days,
 * oldest first, ending today.
 */
export function buildDailySeries(requests = [], days = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)

    buckets.push({
      key: dayKey(date),
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

  requests.forEach((request) => {
    const index = indexByKey.get(dayKey(request.created_at))

    if (index !== undefined) {
      buckets[index].count += 1
    }
  })

  return buckets
}

// =========================================================
// SUMMARY
// =========================================================

function summarize(requests) {
  const now = Date.now()

  const ageMs = (request) =>
    now - new Date(request.created_at).getTime()

  // --- Open / unanswered ---------------------------------

  const open = requests.filter(
    (request) => request.status === 'OPEN'
  )

  const unanswered = open.filter(
    (request) => getResponses(request).length === 0
  )

  const oldestUnansweredAt = unanswered.reduce(
    (oldest, request) =>
      !oldest ||
      new Date(request.created_at) < new Date(oldest)
        ? request.created_at
        : oldest,
    null
  )

  // --- Response rate (last 30 days vs previous 30) -------

  const last30 = requests.filter(
    (request) => ageMs(request) < 30 * DAY_MS
  )

  const previous30 = requests.filter(
    (request) =>
      ageMs(request) >= 30 * DAY_MS &&
      ageMs(request) < 60 * DAY_MS
  )

  const answeredCount = (list) =>
    list.filter((request) => getResponses(request).length > 0)
      .length

  const responseRate = percent(
    answeredCount(last30),
    last30.length
  )

  const previousResponseRate = percent(
    answeredCount(previous30),
    previous30.length
  )

  const responseRateChange =
    responseRate !== null && previousResponseRate !== null
      ? responseRate - previousResponseRate
      : null

  // --- Unmet demand (last 30 days) -----------------------
  // Requests that no pharmacy has marked AVAILABLE or
  // PARTIALLY_AVAILABLE, grouped by medicine name.

  const demand = new Map()

  last30.forEach((request) => {
    if (request.status === 'CANCELLED') return

    const found = getResponses(request).some((response) =>
      FOUND_STATUSES.includes(response.status)
    )

    if (found) return

    getItems(request).forEach((item) => {
      const name = getItemName(item)
      const key = name.toLowerCase()

      const entry = demand.get(key) || {
        name,
        requests: 0,
        quantity: 0,
      }

      entry.requests += 1
      entry.quantity += Number(item.requested_quantity) || 0

      demand.set(key, entry)
    })
  })

  const topUnmet = [...demand.values()]
    .sort(
      (a, b) =>
        b.requests - a.requests || b.quantity - a.quantity
    )
    .slice(0, 5)

  return {
    total: requests.length,
    openCount: open.length,
    unansweredCount: unanswered.length,
    oldestUnansweredAt,
    newLast30Count: last30.length,
    responseRate,
    responseRateChange,
    topUnmet,
  }
}

// =========================================================
// HOOK
// =========================================================

/**
 * Hook: useRequestInsights
 *
 * const { requests, insights, initialLoading, error, refetch }
 *   = useRequestInsights(60000)
 */
export function useRequestInsights(refreshInterval = 60000) {
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchMedicineRequests()

      setRequests(data)
    } catch (err) {
      setError(err.message || 'Failed to load medicine requests')
      console.error('useRequestInsights error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return undefined

    const interval = setInterval(refetch, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, refetch])

  const insights = useMemo(
    () => (requests ? summarize(requests) : null),
    [requests]
  )

  return {
    requests: requests || [],
    insights,
    // true only before the first successful load, so tiles
    // don't flash skeletons on every background refresh
    initialLoading: loading && requests === null,
    error: requests === null ? error : null,
    refetch,
  }
}