// File: superadmin-web/src/services/superadminDashboardServices.js

import { getAccessToken } from './authService'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const CACHE_TTL = 5 * 60 * 1000

const cache = {
  metrics: null,
  metricsExpiry: 0,
}

function getAuthHeaders() {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No auth token found. User must be logged in.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ============================================================
// DASHBOARD METRICS
// ============================================================

export async function fetchDashboardMetrics() {
  try {
    const now = Date.now()

    if (cache.metrics && now < cache.metricsExpiry) {
      return cache.metrics
    }

    const response = await fetch(
      `${API_BASE_URL}/superadmin/dashboard/metrics`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    cache.metrics = result.data
    cache.metricsExpiry = now + CACHE_TTL

    return result.data
  } catch (error) {
    console.error('fetchDashboardMetrics error:', error)
    throw error
  }
}

// ============================================================
// ACTIVITY LOGS (audit log)
// Used by both the dashboard Activity feed and Audit Logs page.
// ============================================================

export async function fetchActivityLogs(limit = 10, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/superadmin/activity-logs?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    return result.data
  } catch (error) {
    console.error('fetchActivityLogs error:', error)
    throw error
  }
}

// ============================================================
// MEDICINE REQUESTS
//
// Existing backend endpoint. For SUPER_ADMIN the controller
// returns every request with its items and pharmacy responses.
// Used for: unanswered requests, response rate, request trend,
// and unmet demand on the dashboard.
// ============================================================

export async function fetchMedicineRequests() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/medicine-requests/pharmacy`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    let result = null

    try {
      result = await response.json()
    } catch {
      // Non-JSON body; handled below.
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message ||
          `API error: ${response.status}`
      )
    }

    return Array.isArray(result?.data)
      ? result.data
      : []
  } catch (error) {
    console.error('fetchMedicineRequests error:', error)
    throw error
  }
}

// ============================================================
// PHARMACIES
// ============================================================

export async function getPharmacies() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/superadmin/pharmacies`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch pharmacies')
    }

    return result.data || []
  } catch (error) {
    console.error('getPharmacies error:', error)
    throw error
  }
}

// ============================================================
// CACHE
// ============================================================

export function invalidateMetricsCache() {
  cache.metrics = null
  cache.metricsExpiry = 0
}