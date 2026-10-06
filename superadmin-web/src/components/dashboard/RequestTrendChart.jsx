// File: superadmin-web/src/components/dashboard/RequestTrendChart.jsx
// Tier 3: new medicine requests per day (real data).
// Replaces RevenueChart, which used hardcoded numbers.

import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

import { buildDailySeries } from '../../hooks/useRequestInsights'
import styles from './Dashboard.module.css'

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
]

const BAR_COLOR = 'rgba(80, 137, 145, 0.75)' // #508991
const BAR_HOVER = '#508991'
const TODAY_COLOR = '#172A3A'
const AXIS_COLOR = '#64748b'

export function RequestTrendChart({
  requests,
  loading,
  error,
  className = '',
}) {
  const [days, setDays] = useState(7)

  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const series = useMemo(
    () => buildDailySeries(requests || [], days),
    [requests, days]
  )

  const total = series.reduce((sum, day) => sum + day.count, 0)

  useEffect(() => {
    if (loading || error || !canvasRef.current) return undefined

    const lastIndex = series.length - 1

    chartRef.current?.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: series.map((day) => day.label),
        datasets: [
          {
            label: 'New requests',
            data: series.map((day) => day.count),
            backgroundColor: series.map((_, index) =>
              index === lastIndex ? TODAY_COLOR : BAR_COLOR
            ),
            hoverBackgroundColor: series.map((_, index) =>
              index === lastIndex ? TODAY_COLOR : BAR_HOVER
            ),
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items) =>
                series[items[0].dataIndex]?.tooltip || '',
              label: (context) =>
                `${context.parsed.y} request${
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
            ticks: {
              precision: 0,
              color: AXIS_COLOR,
              font: { size: 11 },
            },
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: {
              color: AXIS_COLOR,
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: days > 14 ? 8 : days,
            },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [series, loading, error, days])

  const periodLabel =
    PERIODS.find((period) => period.days === days)?.label ||
    `Last ${days} days`

  return (
    <section className={`${styles.tile} ${className}`}>
      <header className={styles.tileHeader}>
        <div>
          <h2 className={styles.tileTitle}>Medicine requests</h2>
          <p className={styles.tileSubtitle}>
            {loading || error
              ? 'New requests per day'
              : `${total.toLocaleString('en-US')} new · ${periodLabel.toLowerCase()}`}
          </p>
        </div>

        <select
          className={styles.periodSelect}
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
        <span className={`${styles.skeleton} ${styles.skeletonChart}`} />
      ) : error ? (
        <p className={`${styles.tileState} ${styles.tileError}`}>
          Couldn't load medicine requests.
        </p>
      ) : (
        <div className={styles.chartWrap}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Bar chart: ${total} new medicine requests, ${periodLabel.toLowerCase()}. Darkest bar is today.`}
          />
        </div>
      )}
    </section>
  )
}