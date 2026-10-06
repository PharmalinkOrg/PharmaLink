// File: superadmin-web/src/hooks/useActivityLogs.js
// Description: Fetches paginated activity (audit) logs.
// Shared by the dashboard Activity feed and the Audit Logs page.

import { useState, useEffect, useCallback } from 'react'
import { fetchActivityLogs } from '../services/superadminDashboardServices'

/**
 * Hook: useActivityLogs
 *
 * @param {number} pageSize         rows per request
 * @param {number} refreshInterval  ms between automatic refreshes
 *                                  of the newest page (0 = off)
 *
 * Usage:
 * const { activities, pagination, loading, error, loadMore, refetch }
 *   = useActivityLogs(10)
 */
export function useActivityLogs(pageSize = 10, refreshInterval = 0) {
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({
    limit: pageSize,
    offset: 0,
    total: 0,
    hasMore: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(
    async (offset) => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchActivityLogs(pageSize, offset)
        const rows = Array.isArray(data?.activities)
          ? data.activities
          : []

        if (offset === 0) {
          // First load / refresh: replace everything
          setActivities(rows)
        } else {
          // Load more: append
          setActivities((prev) => [...prev, ...rows])
        }

        setPagination(
          data?.pagination || {
            limit: pageSize,
            offset,
            total: rows.length,
            hasMore: false,
          }
        )
      } catch (err) {
        setError(err.message || 'Failed to fetch activity logs')
        console.error('useActivityLogs error:', err)
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  // Initial fetch
  useEffect(() => {
    fetchLogs(0)
  }, [fetchLogs])

  // Optional auto-refresh of the newest page
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return undefined

    const interval = setInterval(() => {
      fetchLogs(0)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchLogs])

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchLogs(pagination.offset + pagination.limit)
    }
  }, [pagination, loading, fetchLogs])

  const refetch = useCallback(() => fetchLogs(0), [fetchLogs])

  return {
    activities,
    pagination,
    loading,
    error,
    loadMore,
    refetch,
  }
}