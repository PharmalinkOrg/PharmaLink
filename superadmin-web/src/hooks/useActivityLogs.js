// File: superadmin-web/src/hooks/useActivityLogs.js
// Description: Custom hook for fetching paginated activity logs

import { useState, useEffect, useCallback } from 'react';
import { fetchActivityLogs } from "../services/superadminDashboardServices";

/**
 * Hook: useActivityLogs
 * Fetches activity logs with offset-based pagination
 * 
 * Usage:
 * const { activities, pagination, loading, error, loadMore } = useActivityLogs(10);
 */
export function useActivityLogs(pageSize = 10) {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({
    limit: pageSize,
    offset: 0,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch logs at current offset
  const fetchLogs = useCallback(async (offset) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchActivityLogs(pageSize, offset);
      
      if (offset === 0) {
        // First load: replace all
        setActivities(data.activities);
      } else {
        // Load more: append
        setActivities(prev => [...prev, ...data.activities]);
      }

      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch activity logs');
      console.error('useActivityLogs error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Initial fetch
  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchLogs(pagination.offset + pagination.limit);
    }
  }, [pagination, loading, fetchLogs]);

  return {
    activities,
    pagination,
    loading,
    error,
    loadMore
  };
}