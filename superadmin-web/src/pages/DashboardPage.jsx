// File: superadmin-web/src/pages/DashboardPage.jsx
//
// Bento layout, ordered by what the super admin needs first:
//   1. Needs attention   – things only a super admin can unblock
//   2. Platform health   – 4 headline numbers
//   3. Request trend     – is the platform being used?
//   4. Unmet demand      – medicines customers can't find
//   5. Recent activity   – latest audit log entries

import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Users,
} from 'lucide-react'

import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { useRequestInsights } from '../hooks/useRequestInsights'

import {
  AttentionPanel,
  StatTile,
  UnmetDemand,
} from '../components/dashboard/DashboardTiles'
import { RequestTrendChart } from '../components/dashboard/RequestTrendChart'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import styles from '../components/dashboard/Dashboard.module.css'

function formatNumber(value) {
  if (value === null || value === undefined) return '—'

  const number = Number(value)

  return Number.isFinite(number)
    ? number.toLocaleString('en-US')
    : '—'
}

function DashboardPage() {
  const {
    metrics,
    loading: metricsRefreshing,
    error: metricsError,
  } = useDashboardMetrics(30000)

  const {
    requests,
    insights,
    initialLoading: requestsLoading,
    error: requestsError,
  } = useRequestInsights(60000)

  // Show skeletons only on the very first load, not on
  // every background refresh.
  const metricsLoading = metricsRefreshing && !metrics

  return (
    <>
      {/* Sticky Dashboard Header */}
      <header className="page-header-sticky">
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageCopy}>
            What needs your attention across PharmaLink today
          </p>
        </div>
      </header>

      {/* Dashboard Content */}
      <section className="page-content-wrapper">
        {metricsError && !metrics && (
          <p className={styles.inlineError} role="alert">
            Some platform numbers could not load: {metricsError}
          </p>
        )}

        <div className={styles.bento}>
          {/* 1. Needs attention */}
          <AttentionPanel
            className={styles.areaAttention}
            metrics={metrics}
            insights={insights}
            metricsLoading={metricsLoading}
            insightsLoading={requestsLoading}
            insightsError={requestsError}
          />

          {/* 2. Platform health */}
          <div className={`${styles.statRow} ${styles.areaStats}`}>
            <StatTile
              icon={Building2}
              label="Partner pharmacies"
              loading={metricsLoading}
              value={formatNumber(metrics?.totalPharmacies?.current)}
              change={metrics?.totalPharmacies?.changePercent ?? null}
              trend={metrics?.totalPharmacies?.trend}
              footnote="vs previous period"
            />

            <StatTile
              icon={Users}
              label="Active users"
              loading={metricsLoading}
              value={formatNumber(metrics?.activeUsers?.current)}
              change={metrics?.activeUsers?.changePercent ?? null}
              trend={metrics?.activeUsers?.trend}
              footnote="vs previous period"
            />

            <StatTile
              icon={ClipboardList}
              label="Open requests"
              loading={requestsLoading}
              value={
                requestsError
                  ? '—'
                  : formatNumber(insights?.openCount)
              }
              footnote={
                requestsError
                  ? 'Could not load'
                  : `${formatNumber(insights?.newLast30Count)} new in 30 days`
              }
            />

            <StatTile
              icon={CheckCircle2}
              label="Response rate"
              loading={requestsLoading}
              value={
                requestsError ||
                insights?.responseRate === null ||
                insights?.responseRate === undefined
                  ? '—'
                  : `${insights.responseRate}%`
              }
              change={
                requestsError
                  ? null
                  : insights?.responseRateChange ?? null
              }
              changeUnit=" pts"
              footnote="requests answered · 30 days"
            />
          </div>

          {/* 3. Trend */}
          <RequestTrendChart
            className={styles.areaTrend}
            requests={requests}
            loading={requestsLoading}
            error={requestsError}
          />

          {/* 4. Unmet demand */}
          <UnmetDemand
            className={styles.areaDemand}
            insights={insights}
            loading={requestsLoading}
            error={requestsError}
          />

          {/* 5. Recent activity (audit log) */}
          <ActivityFeed className={styles.areaActivity} />
        </div>
      </section>
    </>
  )
}

export default DashboardPage