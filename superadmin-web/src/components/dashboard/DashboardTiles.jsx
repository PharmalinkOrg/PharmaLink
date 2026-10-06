// File: superadmin-web/src/components/dashboard/DashboardTiles.jsx
// Small bento tiles used by DashboardPage:
//   AttentionPanel  – tier 1: things only the super admin can unblock
//   StatTile        – tier 2: platform health numbers
//   UnmetDemand     – tier 4: most-requested medicines nobody has

import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
} from 'lucide-react'

import { formatDuration } from '../../utils/activityFormat'
import styles from './Dashboard.module.css'

// Sidebar routes used by the dashboard links.
// Change these if your routes use different paths.
export const DASHBOARD_ROUTES = {
  pharmacies: '/pharmacies',
  auditLogs: '/audit-logs',
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number.toLocaleString('en-US')
    : String(value)
}

// =========================================================
// TIER 1 — NEEDS ATTENTION
// =========================================================

export function AttentionPanel({
  metrics,
  insights,
  metricsLoading,
  insightsLoading,
  insightsError,
  className,
}) {
  const pendingPharmacies =
    metrics?.pendingVerification ?? null

  const unansweredRequests = insightsError
    ? null
    : insights?.unansweredCount ?? null

  const complaints = metrics?.complaints?.current ?? 0

  const items = [
    {
      key: 'pharmacies',
      count: pendingPharmacies,
      loading: metricsLoading,
      label: 'Pharmacies awaiting verification',
      hint: 'Verify them so customers can find their stock.',
      to: DASHBOARD_ROUTES.pharmacies,
      action: 'Review',
    },
    {
      key: 'requests',
      count: unansweredRequests,
      loading: insightsLoading,
      label: 'Medicine requests with no pharmacy response',
      hint: insightsError
        ? 'Could not load medicine requests.'
        : insights?.oldestUnansweredAt
          ? `Oldest has waited ${formatDuration(
              insights.oldestUnansweredAt
            )}.`
          : 'Customers are waiting for an answer.',
    },
  ]

  // Only shown when there is something to act on.
  if (complaints > 0) {
    items.push({
      key: 'complaints',
      count: complaints,
      loading: false,
      label: 'Open complaints',
      hint: 'Reports from customers or pharmacies.',
    })
  }

  const anyLoading = items.some((item) => item.loading)

  // A count we couldn't load is unknown, not zero.
  const anyUnknown = items.some(
    (item) => !item.loading && item.count === null
  )

  const total = items.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  )

  const allClear = !anyLoading && !anyUnknown && total === 0

  return (
    <section
      className={cx(styles.tile, styles.attentionTile, className)}
      aria-labelledby="attention-title"
    >
      <div className={styles.attentionSummary}>
        <p
          id="attention-title"
          className={styles.attentionEyebrow}
        >
          Needs your attention
        </p>

        {anyLoading ? (
          <span
            className={cx(styles.skeleton, styles.skeletonTotal)}
          />
        ) : (
          <p className={styles.attentionTotal}>
            {formatNumber(total)}
          </p>
        )}

        <p className={styles.attentionCaption}>
          {allClear
            ? 'All clear. Nothing is waiting on you right now.'
            : 'Items only a super admin can unblock.'}
        </p>
      </div>

      <ul className={styles.attentionList}>
        {items.map((item) => {
          const count = Number(item.count) || 0
          const isUrgent = count > 0

          return (
            <li
              key={item.key}
              className={cx(
                styles.attentionItem,
                isUrgent && styles.isUrgent
              )}
            >
              <span className={styles.attentionCount}>
                {item.loading ? (
                  <span
                    className={cx(
                      styles.skeleton,
                      styles.skeletonCount
                    )}
                  />
                ) : (
                  formatNumber(item.count)
                )}
              </span>

              <div className={styles.attentionText}>
                <p className={styles.attentionLabel}>
                  {item.label}
                </p>
                <p className={styles.attentionHint}>
                  {item.hint}
                </p>
              </div>

              {!item.loading && !isUrgent && item.count !== null ? (
                <span className={styles.attentionDone}>
                  <CheckCircle2 size={15} />
                  Done
                </span>
              ) : item.to && isUrgent ? (
                <Link
                  to={item.to}
                  className={styles.attentionAction}
                >
                  {item.action}
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// =========================================================
// TIER 2 — STAT TILE
// =========================================================

/**
 * change:     number (positive = up)
 * changeUnit: '%' or ' pts'
 * trend:      optional 'up' | 'down' | 'flat' from the API
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  change = null,
  changeUnit = '%',
  trend,
  footnote,
  loading = false,
  className,
}) {
  const direction =
    trend ||
    (change === null || change === 0
      ? 'flat'
      : change > 0
        ? 'up'
        : 'down')

  const ChangeIcon =
    direction === 'up'
      ? ArrowUpRight
      : direction === 'down'
        ? ArrowDownRight
        : Minus

  const changeClass =
    direction === 'up'
      ? styles.changeUp
      : direction === 'down'
        ? styles.changeDown
        : styles.changeFlat

  return (
    <article className={cx(styles.tile, styles.statTile, className)}>
      <div className={styles.statTop}>
        <p className={styles.statLabel}>{label}</p>

        {Icon && (
          <span className={styles.statIcon} aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
      </div>

      {loading ? (
        <span className={cx(styles.skeleton, styles.skeletonValue)} />
      ) : (
        <p className={styles.statValue}>{value}</p>
      )}

      <div className={styles.statFoot}>
        {!loading && change !== null && (
          <span className={cx(styles.change, changeClass)}>
            <ChangeIcon size={12} />
            {Math.abs(change)}
            {changeUnit}
          </span>
        )}

        {footnote && <span>{footnote}</span>}
      </div>
    </article>
  )
}

// =========================================================
// TIER 4 — UNMET DEMAND
// =========================================================

export function UnmetDemand({
  insights,
  loading,
  error,
  className,
}) {
  const rows = insights?.topUnmet || []
  const max = rows.reduce(
    (highest, row) => Math.max(highest, row.requests),
    0
  )

  return (
    <section className={cx(styles.tile, className)}>
      <header className={styles.tileHeader}>
        <div>
          <h2 className={styles.tileTitle}>Unmet demand</h2>
          <p className={styles.tileSubtitle}>
            Requested in the last 30 days, not yet found at any
            pharmacy
          </p>
        </div>
      </header>

      {loading ? (
        <div className={styles.skeletonStack}>
          {[0, 1, 2, 3].map((key) => (
            <span
              key={key}
              className={cx(styles.skeleton, styles.skeletonRow)}
            />
          ))}
        </div>
      ) : error ? (
        <p className={cx(styles.tileState, styles.tileError)}>
          Couldn't load medicine requests.
        </p>
      ) : rows.length === 0 ? (
        <p className={styles.tileState}>
          Every recent request found a pharmacy.
        </p>
      ) : (
        <ol className={styles.demandList}>
          {rows.map((row) => (
            <li key={row.name} className={styles.demandRow}>
              <div className={styles.demandTop}>
                <span
                  className={styles.demandName}
                  title={row.name}
                >
                  {row.name}
                </span>

                <span className={styles.demandCount}>
                  {row.requests} request
                  {row.requests === 1 ? '' : 's'}
                  {row.quantity > 0 && ` · ${row.quantity} units`}
                </span>
              </div>

              <span className={styles.demandBar} aria-hidden="true">
                <span
                  className={styles.demandFill}
                  style={{
                    width: `${max ? (row.requests / max) * 100 : 0}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}