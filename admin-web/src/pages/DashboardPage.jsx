// File: admin-web/src/pages/DashboardPage.jsx
//
// Pharmacy admin dashboard: bento layout, ordered by what the
// pharmacy needs to act on first.
//   1. Needs attention  – reservations to confirm, requests to
//                         answer, stock running out, expiring
//   2. Today's pickups  – same-day reservations in time order
//   3. At a glance      – 4 headline numbers
//   4. Reservations     – new reservations per day
//   5. Stock watchlist  – batches to restock or check

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageCircle,
  Minus,
  Package,
  PackageCheck,
  Pill,
  RefreshCw,
} from 'lucide-react'

import { useAuth } from '../components/auth/useAuth'
import {
  EXPIRY_WINDOW_DAYS,
  buildDailySeries,
  buildInsights,
  usePharmacyDashboard,
} from '../hooks/usePharmacyDashboard'

import './DashboardPage.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

// Sidebar routes (from AdminLayout)
const ROUTES = {
  reservations: '/reservations',
  requests: '/medicine-requests',
  inventory: '/inventory',
}

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
]

// =========================================================
// FORMATTERS
// =========================================================

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—'

  const number = Number(value)

  return Number.isFinite(number) ? number.toLocaleString('en-US') : '—'
}

function formatTime(value) {
  if (!value) return '—'

  const [hours, minutes] = String(value).split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(value)

  const suffix = hours >= 12 ? 'PM' : 'AM'

  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function formatWaited(since) {
  const start = new Date(since)

  if (Number.isNaN(start.getTime())) return ''

  const minutes = Math.max(
    Math.floor((Date.now() - start.getTime()) / 60000),
    0
  )

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`

  const days = Math.floor(hours / 24)

  return `${days} day${days === 1 ? '' : 's'}`
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'

  return 'Good evening'
}

function customerName(reservation) {
  const customer = reservation.users || reservation.customer

  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || `Customer #${reservation.customer_id}`
}

function itemSummary(reservation) {
  const items = Array.isArray(reservation.reservation_items)
    ? reservation.reservation_items
    : []

  if (items.length === 0) return 'No items'

  const first = items[0]?.medicines
  const firstName =
    first?.brand_name || first?.generic_name || 'Medicine'

  return items.length === 1
    ? `${firstName} × ${items[0].quantity ?? 1}`
    : `${firstName} + ${items.length - 1} more`
}

const PICKUP_STATUS = {
  PENDING: { label: 'To confirm', className: 'pd-pill-warning' },
  CONFIRMED: { label: 'Confirmed', className: 'pd-pill-info' },
  COMPLETED: { label: 'Picked up', className: 'pd-pill-success' },
}

// =========================================================
// 1. NEEDS ATTENTION
// =========================================================

function AttentionPanel({ insights, loading, className }) {
  const pickupHint = insights?.nextPendingPickup
    ? `Next pickup today at ${formatTime(
        insights.nextPendingPickup.pickup_time
      )}.`
    : 'Customers are waiting for your confirmation.'

  const stockHint =
    insights?.outCount || insights?.lowCount
      ? `${formatNumber(insights.outCount)} out of stock · ${formatNumber(
          insights.lowCount
        )} running low.`
      : 'Every batch is above its reorder level.'

  const expiryHint = insights?.expiredCount
    ? `${formatNumber(insights.expiredCount)} already expired. Remove them from sale.`
    : `Batches with stock expiring in the next ${EXPIRY_WINDOW_DAYS} days.`

  const stockCount =
    insights?.outCount === null && insights?.lowCount === null
      ? null
      : (Number(insights?.outCount) || 0) +
        (Number(insights?.lowCount) || 0)

  const items = [
    {
      key: 'reservations',
      count: insights?.pendingCount ?? null,
      label: 'Reservations to confirm',
      hint: pickupHint,
      to: ROUTES.reservations,
      action: 'Review',
    },
    {
      key: 'requests',
      count: insights?.awaitingCount ?? null,
      label: 'Medicine requests to answer',
      hint: insights?.oldestAwaitingAt
        ? `Oldest has waited ${formatWaited(insights.oldestAwaitingAt)}.`
        : 'Let customers know if you have it.',
      to: ROUTES.requests,
      action: 'Respond',
    },
    {
      key: 'stock',
      count: stockCount,
      label: 'Batches low or out of stock',
      hint: stockHint,
      to: ROUTES.inventory,
      action: 'Restock',
    },
    {
      key: 'expiry',
      count: insights?.expiringCount ?? null,
      label: 'Batches expiring soon',
      hint: expiryHint,
      to: ROUTES.inventory,
      action: 'Check',
    },
  ]

  const anyUnknown = items.some((item) => item.count === null)

  const total = items.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  )

  const allClear = !loading && !anyUnknown && total === 0

  return (
    <section
      className={cx('pd-tile', 'pd-attention', className)}
      aria-labelledby="pd-attention-title"
    >
      <div className="pd-attention-summary">
        <p id="pd-attention-title" className="pd-eyebrow">
          Needs your attention
        </p>

        {loading ? (
          <span className="pd-skeleton pd-skeleton-total" />
        ) : (
          <p className="pd-attention-total">{formatNumber(total)}</p>
        )}

        <p className="pd-attention-caption">
          {allClear
            ? 'All clear. Nothing is waiting on you right now.'
            : 'Things customers are waiting on, or stock that needs a look.'}
        </p>
      </div>

      <ul className="pd-attention-list">
        {items.map((item) => {
          const count = Number(item.count) || 0
          const isUrgent = count > 0

          return (
            <li
              key={item.key}
              className={cx('pd-attention-item', isUrgent && 'is-urgent')}
            >
              <span className="pd-attention-count">
                {loading ? (
                  <span className="pd-skeleton pd-skeleton-count" />
                ) : (
                  formatNumber(item.count)
                )}
              </span>

              <div className="pd-attention-text">
                <p className="pd-attention-label">{item.label}</p>
                <p className="pd-attention-hint">
                  {item.count === null && !loading
                    ? 'Could not load this right now.'
                    : item.hint}
                </p>
              </div>

              {!loading && isUrgent ? (
                <Link to={item.to} className="pd-attention-action">
                  {item.action}
                  <ArrowRight size={14} />
                </Link>
              ) : !loading && item.count !== null ? (
                <span className="pd-attention-done">
                  <CheckCircle2 size={15} />
                  Done
                </span>
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
// 2. TODAY'S PICKUPS
// =========================================================

function TodaysPickups({ insights, loading, failed, className }) {
  const pickups = insights?.todaysPickups || []

  const remaining = pickups.filter(
    (pickup) => pickup.status !== 'COMPLETED'
  ).length

  return (
    <section className={cx('pd-tile', 'pd-pickups', className)}>
      <header className="pd-tile-header">
        <div>
          <h2 className="pd-tile-title">Today&apos;s pickups</h2>
          <p className="pd-tile-subtitle">
            {loading || failed
              ? 'Same-day reservations'
              : pickups.length === 0
                ? 'No pickups scheduled today'
                : `${remaining} still to hand over · ${pickups.length} total`}
          </p>
        </div>

        <Link to={ROUTES.reservations} className="pd-tile-link">
          All reservations
          <ArrowRight size={14} />
        </Link>
      </header>

      {loading ? (
        <div className="pd-skeleton-stack">
          {[0, 1, 2, 3, 4].map((key) => (
            <span key={key} className="pd-skeleton pd-skeleton-row" />
          ))}
        </div>
      ) : failed ? (
        <p className="pd-tile-state pd-tile-error">
          Couldn&apos;t load reservations.
        </p>
      ) : pickups.length === 0 ? (
        <p className="pd-tile-state">
          New same-day reservations will appear here.
        </p>
      ) : (
        <ol className="pd-pickup-list">
          {pickups.map((pickup) => {
            const status = PICKUP_STATUS[pickup.status] || {
              label: pickup.status,
              className: 'pd-pill-neutral',
            }

            return (
              <li
                key={pickup.reservation_id}
                className={cx(
                  'pd-pickup',
                  pickup.status === 'COMPLETED' && 'is-done'
                )}
              >
                <span className="pd-pickup-time">
                  {formatTime(pickup.pickup_time)}
                </span>

                <div className="pd-pickup-body">
                  <p className="pd-pickup-name">
                    {customerName(pickup)}
                  </p>
                  <p className="pd-pickup-items">
                    #{pickup.reservation_id} · {itemSummary(pickup)}
                  </p>
                </div>

                <div className="pd-pickup-status">
                  <span className={cx('pd-pill', status.className)}>
                    {status.label}
                  </span>

                  {pickup.isLate && (
                    <span className="pd-late">Past pickup time</span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

// =========================================================
// 3. STAT TILE
// =========================================================

function StatTile({
  icon: Icon,
  label,
  value,
  change = null,
  changeUnit = '%',
  footnote,
  loading,
}) {
  const direction =
    change === null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'

  const ChangeIcon =
    direction === 'up'
      ? ArrowUpRight
      : direction === 'down'
        ? ArrowDownRight
        : Minus

  return (
    <article className="pd-tile pd-stat">
      <div className="pd-stat-top">
        <p className="pd-stat-label">{label}</p>

        {Icon && (
          <span className="pd-stat-icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
      </div>

      {loading ? (
        <span className="pd-skeleton pd-skeleton-value" />
      ) : (
        <p className="pd-stat-value">{value}</p>
      )}

      <div className="pd-stat-foot">
        {!loading && change !== null && (
          <span className={cx('pd-change', `pd-change-${direction}`)}>
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
// 4. RESERVATION TREND
// =========================================================

function ReservationTrend({ reservations, loading, failed, className }) {
  const [days, setDays] = useState(7)

  const series = useMemo(
    () => buildDailySeries(reservations || [], days),
    [reservations, days]
  )

  const total = series.reduce((sum, day) => sum + day.count, 0)
  const lastIndex = series.length - 1

  const periodLabel =
    PERIODS.find((period) => period.days === days)?.label ||
    `Last ${days} days`

  const chartData = useMemo(
    () => ({
      labels: series.map((day) => day.label),
      datasets: [
        {
          label: 'New reservations',
          data: series.map((day) => day.count),
          backgroundColor: series.map((_, index) =>
            index === lastIndex ? '#172A3A' : 'rgba(80, 137, 145, 0.75)'
          ),
          hoverBackgroundColor: series.map((_, index) =>
            index === lastIndex ? '#172A3A' : '#508991'
          ),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    }),
    [series, lastIndex]
  )

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items) => series[items[0].dataIndex]?.tooltip || '',
            label: (context) =>
              `${context.parsed.y} reservation${
                context.parsed.y === 1 ? '' : 's'
              }`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: 'rgba(15, 23, 42, 0.06)' },
          ticks: { precision: 0, color: '#64748b', font: { size: 11 } },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: days > 14 ? 8 : days,
          },
        },
      },
    }),
    [series, days]
  )

  return (
    <section className={cx('pd-tile', className)}>
      <header className="pd-tile-header">
        <div>
          <h2 className="pd-tile-title">Reservations</h2>
          <p className="pd-tile-subtitle">
            {loading || failed
              ? 'New reservations per day'
              : `${formatNumber(total)} new · ${periodLabel.toLowerCase()}`}
          </p>
        </div>

        <select
          className="pd-period"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          aria-label="Chart period"
        >
          {PERIODS.map((period) => (
            <option key={period.days} value={period.days}>
              {period.label}
            </option>
          ))}
        </select>
      </header>

      {loading ? (
        <span className="pd-skeleton pd-skeleton-chart" />
      ) : failed ? (
        <p className="pd-tile-state pd-tile-error">
          Couldn&apos;t load reservations.
        </p>
      ) : (
        <div
          className="pd-chart"
          role="img"
          aria-label={`Bar chart: ${total} new reservations, ${periodLabel.toLowerCase()}. Darkest bar is today.`}
        >
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </section>
  )
}

// =========================================================
// 5. STOCK WATCHLIST
// =========================================================

function StockWatchlist({ insights, loading, failed, className }) {
  const rows = insights?.watchlist || []
  const total = insights?.watchlistTotal || 0

  return (
    <section className={cx('pd-tile', className)}>
      <header className="pd-tile-header">
        <div>
          <h2 className="pd-tile-title">Stock watchlist</h2>
          <p className="pd-tile-subtitle">
            Low, out of stock, or expiring within {EXPIRY_WINDOW_DAYS}{' '}
            days
          </p>
        </div>

        <Link to={ROUTES.inventory} className="pd-tile-link">
          Inventory
          <ArrowRight size={14} />
        </Link>
      </header>

      {loading ? (
        <div className="pd-skeleton-stack">
          {[0, 1, 2, 3].map((key) => (
            <span key={key} className="pd-skeleton pd-skeleton-row" />
          ))}
        </div>
      ) : failed ? (
        <p className="pd-tile-state pd-tile-error">
          Couldn&apos;t load inventory.
        </p>
      ) : rows.length === 0 ? (
        <p className="pd-tile-state">
          Nothing to restock or check right now.
        </p>
      ) : (
        <>
          <ul className="pd-watch-list">
            {rows.map((row) => (
              <li key={row.id} className="pd-watch-row">
                <div className="pd-watch-main">
                  <p className="pd-watch-name" title={row.name}>
                    {row.name}
                  </p>
                  <p className="pd-watch-meta">
                    {[
                      row.detail,
                      row.batch ? `Batch ${row.batch}` : null,
                      `${formatNumber(row.quantity)} left`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="pd-watch-flags">
                  {row.flags.map((flag) => (
                    <span
                      key={flag.label}
                      className={cx(
                        'pd-pill',
                        flag.tone === 'danger'
                          ? 'pd-pill-danger'
                          : 'pd-pill-warning'
                      )}
                    >
                      {flag.label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {total > rows.length && (
            <p className="pd-watch-more">
              +{total - rows.length} more on the Inventory page
            </p>
          )}
        </>
      )}
    </section>
  )
}

// =========================================================
// PAGE
// =========================================================

function DashboardPage() {
  const { accessToken, user } = useAuth()

  const {
    data,
    errors,
    initialLoading,
    refreshing,
    lastUpdated,
    refetch,
  } = usePharmacyDashboard({
    token: accessToken,
    pharmacyId: user?.pharmacy_id,
    refreshInterval: 60000,
  })

  const insights = useMemo(
    () => buildInsights(data, user?.pharmacy_id),
    [data, user?.pharmacy_id]
  )

  // A source "failed" only if it errored and we have no data for it
  const failed = (key) =>
    Boolean(errors[key]) && (data?.[key] === undefined || data?.[key] === null)

  const everythingFailed =
    !initialLoading &&
    ['summary', 'reservations', 'requests', 'inventory', 'medicines'].every(
      failed
    )

  return (
    <>
      <div className="page-header-sticky">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-copy">
            {getGreeting()}
            {user?.first_name ? `, ${user.first_name}` : ''}. Here&apos;s
            what needs your attention today.
          </p>
        </div>

        <div className="pd-header-meta">
          {lastUpdated && (
            <span>
              Updated{' '}
              {lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}

          <button
            type="button"
            className="pd-refresh"
            onClick={refetch}
            disabled={initialLoading || refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'is-spinning' : undefined}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="page-content-wrapper">
        {everythingFailed && (
          <p className="pd-banner" role="alert">
            The dashboard could not load. Check your connection and
            press Refresh.
          </p>
        )}

        <div className="pd-bento">
          {/* 1 */}
          <AttentionPanel
            className="pd-area-attention"
            insights={insights}
            loading={initialLoading}
          />

          {/* 3 */}
          <div className="pd-stat-row pd-area-stats">
            <StatTile
              icon={Pill}
              label="Active medicines"
              loading={initialLoading}
              value={formatNumber(insights?.activeMedicineCount)}
              footnote={
                insights?.medicineCount !== null &&
                insights?.medicineCount !== undefined
                  ? `${formatNumber(insights.medicineCount)} in catalog`
                  : null
              }
            />

            <StatTile
              icon={Package}
              label="Stock batches"
              loading={initialLoading}
              value={formatNumber(insights?.batchCount)}
              footnote={
                insights?.lowCount !== null &&
                insights?.lowCount !== undefined
                  ? `${formatNumber(insights.lowCount)} low · ${formatNumber(
                      insights.outCount
                    )} out`
                  : null
              }
            />

            <StatTile
              icon={PackageCheck}
              label="Pickups completed"
              loading={initialLoading}
              value={formatNumber(insights?.completedLast7)}
              change={insights?.completedChange ?? null}
              footnote="last 7 days"
            />

            <StatTile
              icon={MessageCircle}
              label="Requests answered"
              loading={initialLoading}
              value={
                insights?.responseRate === null ||
                insights?.responseRate === undefined
                  ? '—'
                  : `${insights.responseRate}%`
              }
              footnote={
                insights?.recentRequestCount
                  ? `of ${formatNumber(insights.recentRequestCount)} · 30 days`
                  : 'last 30 days'
              }
            />
          </div>

          {/* 4 */}
          <ReservationTrend
            className="pd-area-trend"
            reservations={data?.reservations}
            loading={initialLoading}
            failed={failed('reservations')}
          />

          {/* 5 */}
          <StockWatchlist
            className="pd-area-watch"
            insights={insights}
            loading={initialLoading}
            failed={failed('inventory')}
          />

          {/* 2 */}
          <TodaysPickups
            className="pd-area-pickups"
            insights={insights}
            loading={initialLoading}
            failed={failed('reservations')}
          />
        </div>
      </div>
    </>
  )
}

export default DashboardPage