// File: superadmin-web/src/components/dashboard/MetricsGrid.jsx

import { Building2, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { KPICard } from './KPICard'
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics'
import styles from './Dashboard.module.css'

/**
 * MetricsGrid Component
 * Displays 4 KPI cards:
 * Total Pharmacies, Active Users,
 * Pending Verification, Complaints
 */
export function MetricsGrid() {
  const { metrics, loading, error } = useDashboardMetrics(30000)

  if (error) {
    return (
      <div className={styles.metricsErrorContainer}>
        <p className={styles.metricsErrorText}>
          Failed to load metrics: {error}
        </p>
      </div>
    )
  }

  if (loading || !metrics) {
    return (
      <div className={styles.metricsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.metricsGrid}>
      <KPICard
        icon={Building2}
        label="Total Pharmacies"
        value={metrics.totalPharmacies.current}
        changePercent={metrics.totalPharmacies.changePercent}
        trend={metrics.totalPharmacies.trend}
        accentColor="green"
      />

      <KPICard
        icon={Users}
        label="Active Users"
        value={metrics.activeUsers.current}
        changePercent={metrics.activeUsers.changePercent}
        trend={metrics.activeUsers.trend}
        accentColor="blue"
      />

      <KPICard
        icon={CheckCircle}
        label="Pending Verification"
        value={metrics.pendingVerification}
        changePercent={0}
        trend="flat"
        accentColor="orange"
      />

      <KPICard
        icon={AlertCircle}
        label="Complaints"
        value={metrics.complaints.current}
        changePercent={metrics.complaints.changePercent}
        trend={metrics.complaints.trend}
        accentColor="red"
      />
    </div>
  )
}