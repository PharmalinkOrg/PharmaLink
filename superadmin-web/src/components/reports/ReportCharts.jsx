// File: superadmin-web/src/components/reports/ReportCharts.jsx
//
// Small, dependency-free chart components for the Reports page.
// Single-series charts use one blue; text always uses text colors.

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'

import './ReportCharts.css'

/* ============================================================
   HELPERS
============================================================ */

function niceMax(value) {
  if (!value || value <= 0) return 4

  const exponent = Math.floor(Math.log10(value))
  const base = 10 ** exponent
  const fraction = value / base
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10

  return niceFraction * base
}

function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!ref.current) return undefined

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

// Column path: 4px rounded top (data end), square at the baseline.
function columnPath(x, y, width, height) {
  const radius = Math.min(4, width / 2, height)

  if (height <= 0) return ''

  return [
    `M${x},${y + height}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

/* ============================================================
   CHART CARD (chart / table toggle)
============================================================ */

export function ChartCard({ title, subtitle, children, table, unavailable, action }) {
  const [view, setView] = useState('chart')

  return (
    <section className="report-card">
      <header className="report-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className="report-card-tools">
          {action}

          {!unavailable && table && (
            <div className="report-view-toggle" role="group" aria-label={`${title} view`}>
              <button
                type="button"
                className={view === 'chart' ? 'is-active' : ''}
                onClick={() => setView('chart')}
                aria-pressed={view === 'chart'}
                title="Chart view"
              >
                <BarChart3 size={14} />
              </button>
              <button
                type="button"
                className={view === 'table' ? 'is-active' : ''}
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                title="Table view"
              >
                <Table2 size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="report-card-body">
        {unavailable ? (
          <div className="report-unavailable">{unavailable}</div>
        ) : view === 'table' && table ? (
          table
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/* ============================================================
   DATA TABLE (table view for any chart)
============================================================ */

export function DataTable({ columns, rows }) {
  return (
    <div className="report-table-wrapper">
      <table className="report-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.numeric ? 'is-numeric' : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key ?? index}>
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? 'is-numeric' : ''}>
                  {column.format ? column.format(row[column.key]) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ============================================================
   COLUMN CHART (values over time, one series)
============================================================ */

const CHART_HEIGHT = 220
const MARGIN = { top: 12, right: 8, bottom: 28, left: 44 }

export function ColumnChart({ data, formatValue = (value) => String(value), seriesLabel }) {
  const [ref, width] = useElementWidth()
  const [hovered, setHovered] = useState(null)

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

  const maxValue = niceMax(Math.max(0, ...data.map((item) => item.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => step * maxValue)

  const band = data.length ? innerWidth / data.length : 0
  // Thin marks: at most 24px, always leaving a gap between columns.
  const barWidth = Math.max(2, Math.min(24, band - Math.max(2, band * 0.3)))

  // Show at most ~8 x-axis labels.
  const labelEvery = Math.max(1, Math.ceil(data.length / 8))

  const yFor = (value) => MARGIN.top + innerHeight - (value / maxValue) * innerHeight
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const hoveredItem = hovered !== null ? data[hovered] : null

  return (
    <div className="column-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={`${seriesLabel}: ${formatValue(total)} total across ${data.length} periods`}
        >
          {/* Grid + y axis */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className={tick === 0 ? 'chart-baseline' : 'chart-grid'}
              />
              <text x={MARGIN.left - 8} y={yFor(tick)} dy="0.32em" textAnchor="end" className="chart-tick">
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {/* Columns */}
          {data.map((item, index) => {
            const x = MARGIN.left + index * band + (band - barWidth) / 2
            const y = yFor(item.value)
            const height = MARGIN.top + innerHeight - y

            return (
              <path
                key={item.key}
                d={columnPath(x, y, barWidth, height)}
                className={`chart-column ${hovered !== null && hovered !== index ? 'is-dimmed' : ''}`}
              />
            )
          })}

          {/* X labels */}
          {data.map((item, index) =>
            index % labelEvery === 0 ? (
              <text
                key={item.key}
                x={MARGIN.left + index * band + band / 2}
                y={CHART_HEIGHT - 8}
                textAnchor="middle"
                className="chart-tick"
              >
                {item.shortLabel || item.label}
              </text>
            ) : null
          )}

          {/* Hit targets: the full band, bigger than the mark */}
          {data.map((item, index) => (
            <rect
              key={item.key}
              x={MARGIN.left + index * band}
              y={MARGIN.top}
              width={band}
              height={innerHeight}
              className="chart-hit"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={`${item.label}: ${formatValue(item.value)}`}
            />
          ))}
        </svg>
      )}

      {hoveredItem && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(
              Math.max(MARGIN.left + hovered * band + band / 2, 70),
              Math.max(70, width - 70)
            ),
            top: Math.max(yFor(hoveredItem.value) - 10, 0),
          }}
        >
          <span>{hoveredItem.label}</span>
          <strong>
            <i className="chart-swatch" />
            {seriesLabel}: {formatValue(hoveredItem.value)}
          </strong>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   BAR LIST (ranked categories, one series)
============================================================ */

export function BarList({ items, formatValue = (value) => String(value), emptyLabel = 'No data in this period.' }) {
  const max = Math.max(0, ...items.map((item) => item.value))

  if (items.length === 0 || max === 0) {
    return <div className="report-empty">{emptyLabel}</div>
  }

  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.key} className="bar-list-row" title={`${item.label}: ${formatValue(item.value)}`}>
          <span className="bar-list-label">
            {item.icon}
            {item.label}
          </span>

          <span className="bar-list-track">
            <span
              className="bar-list-fill"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 1.5 : 0)}%` }}
            />
          </span>

          <span className="bar-list-value">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  )
}
