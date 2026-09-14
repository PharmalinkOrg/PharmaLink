// File: superadmin-web/src/hooks/useDashboardMetrics.js
// Description: Custom hook for fetching dashboard metrics with caching and auto-refresh

import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardMetrics } from "../services/superadminDashboardServices";

/**
 * Hook: useDashboardMetrics
 * Fetches metrics with caching and auto-refresh at specified interval
 * 
 * Usage:
 * const { metrics, loading, error, refetch } = useDashboardMetrics(30000); // refresh every 30s
 */
export function useDashboardMetrics(refreshInterval = 30000) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch metrics
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics');
      console.error('useDashboardMetrics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh at interval
  useEffect(() => {
    if (refreshInterval <= 0) return; // Disable auto-refresh if interval is 0 or negative

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetch]);

  return { metrics, loading, error, refetch };
}