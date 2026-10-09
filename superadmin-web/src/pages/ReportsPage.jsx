// File: superadmin-web/src/pages/ReportsPage.jsx
//
// System-wide reports: users, pharmacies, reservations, medicine
// requests, prescriptions and sales for a chosen date range.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarRange,
  ClipboardList,
  Download,
  FileCheck2,
  Info,
  Loader2,
  Printer,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from 'lucide-react'

import { BarList, ChartCard, ColumnChart, DataTable } from '../components/reports/ReportCharts'
import {
  buildPeriods,
  chooseInterval,
  formatPeriodLabel,
  getReportSummary,
  toDateKey,
} from '../services/reportService'
import { downloadCsv, loadSettings } from '../services/settingsService'

import './ReportsPage.css'

/* ============================================================
   CONSTANTS + FORMATTERS
============================================================ */

const RANGE_PRESETS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '12m', label: '12 months', days: 365 },
  { id: 'custom', label: 'Custom' },
]

const MAX_RANGE_DAYS = 731

const numberFormat = new Intl.NumberFormat('en-US')
const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})
const compactPeso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatNumber = (value) =>
  value === null || value === undefined ? '—' : numberFormat.format(Number(value) || 0)

const formatPeso = (value) =>
  value === null || value === undefined ? '—' : pesoFormat.format(Number(value) || 0)

const STATUS_LABELS = {
  EXPIRED: 'No-show (expired)',
}

const formatStatusLabel = (status) =>
  STATUS_LABELS[status] ||
  String(status || 'Unknown')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const percent = (part, whole) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'

const sumValues = (object) =>
  Object.values(object || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)

function statusItems(byStatus, order = []) {
  const entries = Object.entries(byStatus || {})

  return entries
    .map(([status, value]) => ({
      key: status,
      label: formatStatusLabel(status),
      value: Number(value) || 0,
    }))
    .sort((a, b) => {
      const orderA = order.indexOf(a.key)
      const orderB = order.indexOf(b.key)

      if (orderA !== -1 || orderB !== -1) {
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
      }

      return b.value - a.value
    })
}

/* ============================================================
   STAT TILE
============================================================ */

function StatTile({ icon: Icon, label, value, detail, unavailable }) {
  return (
    <div className={`report-stat ${unavailable ? 'is-unavailable' : ''}`}>
      <div className="report-stat-label">
        <Icon size={15} />
        <span>{label}</span>
      </div>

      <strong className="report-stat-value">{unavailable ? '—' : value}</strong>
      <span className="report-stat-detail">{unavailable ? 'Not available yet' : detail}</span>
    </div>
  )
}

/* ============================================================
   PAGE
============================================================ */

export function ReportsPage() {
  const [settings] = useState(() => loadSettings())
  const timeZone = settings.general.timezone

  const todayKey = toDateKey(new Date(), timeZone)

  const [preset, setPreset] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(todayKey)

  const [report, setReport] = useState(null)
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')

  /* ==========================================================
     RANGE
  ========================================================== */

  const range = useMemo(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null

      return { fromKey: customFrom, toKey: customTo }
    }

    const days = RANGE_PRESETS.find((item) => item.id === preset)?.days || 30
    const from = new Date(`${todayKey}T00:00:00Z`)
    from.setUTCDate(from.getUTCDate() - (days - 1))

    return { fromKey: from.toISOString().slice(0, 10), toKey: todayKey }
  }, [preset, customFrom, customTo, todayKey])

  const interval = range
    ? chooseInterval(new Date(`${range.fromKey}T00:00:00Z`), new Date(`${range.toKey}T00:00:00Z`))
    : 'day'

  /* ==========================================================
     LOAD
  ========================================================== */

  const loadReport = useCallback(async () => {
    if (!range) return

    const fromDate = new Date(`${range.fromKey}T00:00:00Z`)
    const toDate = new Date(`${range.toKey}T00:00:00Z`)

    if (fromDate > toDate) {
      setRangeError('The start date must be before the end date.')
      return
    }

    if ((toDate - fromDate) / 86400000 > MAX_RANGE_DAYS) {
      setRangeError('Choose a range of two years or less.')
      return
    }

    setRangeError('')

    try {
      setLoading(true)
      setError('')

      const result = await getReportSummary({ ...range, interval, timeZone })

      setReport(result.report)
      setSource(result.source)
    } catch (loadError) {
      console.error('Failed to load report:', loadError)
      setError(loadError.message || 'Failed to load the report.')
    } finally {
      setLoading(false)
    }
  }, [range, interval, timeZone])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  /* ==========================================================
     SERIES
  ========================================================== */

  const periods = useMemo(
    () => (range ? buildPeriods(range.fromKey, range.toKey, interval) : []),
    [range, interval]
  )

  // Fill gaps so every period in the range has a value.
  const toSeries = useCallback(
    (rows, valueKey) => {
      if (!Array.isArray(rows)) return null

      const values = new Map(
        rows.map((row) => [String(row.period).slice(0, interval === 'month' ? 7 : 10), Number(row[valueKey]) || 0])
      )

      return periods.map((period) => ({
        key: period,
        label: formatPeriodLabel(period, interval),
        shortLabel: formatPeriodLabel(period, interval === 'week' ? 'day' : interval),
        value: values.get(period) || 0,
      }))
    },
    [periods, interval]
  )

  const users = report?.users || null
  const pharmacies = report?.pharmacies || null
  const reservations = report?.reservations || null
  const requests = report?.medicineRequests || null
  const prescriptions = report?.prescriptions || null
  const sales = report?.sales || null

  const userSeries = toSeries(users?.series, 'count')
  const reservationSeries = toSeries(reservations?.series, 'count')
  const salesSeries = toSeries(sales?.series, 'amount')

  const pharmacyStatusItems = statusItems(pharmacies?.byStatus, ['ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED', 'REJECTED'])
  const reservationStatusItems = statusItems(reservations?.byStatus, [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED',
  ])
  const prescriptionItems = statusItems(prescriptions?.byStatus, ['PENDING', 'VERIFIED', 'REJECTED'])
  const requestStatusItems = statusItems(requests?.byStatus)

  const topMedicines = (requests?.topMedicines || []).slice(0, 8).map((item, index) => ({
    key: `${item.name}-${index}`,
    label: item.name,
    value: Number(item.count) || 0,
  }))

  const topPharmacies = (sales?.topPharmacies || []).slice(0, 8).map((item, index) => ({
    key: `${item.name}-${index}`,
    label: item.name,
    value: Number(item.amount) || 0,
  }))

  const activePharmacies = Number(pharmacies?.byStatus?.ACTIVE) || 0
  const pendingPharmacies = Number(pharmacies?.byStatus?.PENDING) || 0
  const reservationTotal = reservations ? Number(reservations.total ?? sumValues(reservations.byStatus)) : 0
  const completedReservations = Number(reservations?.byStatus?.COMPLETED) || 0
  const prescriptionTotal = prescriptions ? Number(prescriptions.total ?? sumValues(prescriptions.byStatus)) : 0
  const verifiedPrescriptions = Number(prescriptions?.byStatus?.VERIFIED) || 0

  const formatFullDate = (key) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })

  const rangeLabel = range ? `${formatFullDate(range.fromKey)} – ${formatFullDate(range.toKey)}` : ''

  /* ==========================================================
     EXPORT
  ========================================================== */

  const handleExport = () => {
    if (!report || !range) return

    const rows = [
      ['PharmaLink System Report'],
      ['Range', range.fromKey, range.toKey],
      ['Generated', new Date().toLocaleString('en-US', { timeZone })],
      [],
      ['Summary', 'Value'],
      ['Users (total)', users?.total ?? ''],
      ['Customers', users?.customers ?? ''],
      ['Pharmacy admins', users?.pharmacyAdmins ?? ''],
      ['New users in range', users?.newInRange ?? ''],
      ['Pharmacies (total)', pharmacies?.total ?? ''],
      ['Active pharmacies', activePharmacies],
      ['Pending pharmacies', pendingPharmacies],
      ['Reservations in range', reservations ? reservationTotal : ''],
      ['Medicine requests in range', requests?.total ?? ''],
      ['Prescriptions in range', prescriptions ? prescriptionTotal : ''],
      ['Sales in range (PHP)', sales?.totalAmount ?? ''],
      ['Sales transactions', sales?.transactions ?? ''],
    ]

    const addSection = (title, header, items) => {
      if (!items || items.length === 0) return
      rows.push([], [title], header, ...items)
    }

    addSection('New users by period', ['Period', 'New users'], userSeries?.map((i) => [i.label, i.value]))
    addSection('Pharmacies by status', ['Status', 'Count'], pharmacyStatusItems.map((i) => [i.label, i.value]))
    addSection('Reservations by period', ['Period', 'Reservations'], reservationSeries?.map((i) => [i.label, i.value]))
    addSection('Reservations by status', ['Status', 'Count'], reservationStatusItems.map((i) => [i.label, i.value]))
    addSection('Sales by period', ['Period', 'Amount (PHP)'], salesSeries?.map((i) => [i.label, i.value]))
    addSection('Top pharmacies by sales', ['Pharmacy', 'Amount (PHP)'], topPharmacies.map((i) => [i.label, i.value]))
    addSection('Most requested medicines', ['Medicine', 'Requests'], topMedicines.map((i) => [i.label, i.value]))
    addSection('Medicine requests by status', ['Status', 'Count'], requestStatusItems.map((i) => [i.label, i.value]))
    addSection('Prescriptions by status', ['Status', 'Count'], prescriptionItems.map((i) => [i.label, i.value]))

    downloadCsv(`pharmalink-report-${range.fromKey}-to-${range.toKey}.csv`, rows)
  }

  /* ==========================================================
     RENDER HELPERS
  ========================================================== */

  const notAvailable =
    'Not available yet. This section appears once the reports endpoint is added to the server.'

  const seriesTable = (series, label, format) =>
    series && (
      <DataTable
        columns={[
          { key: 'label', label: 'Period' },
          { key: 'value', label, numeric: true, format },
        ]}
        rows={series}
      />
    )

  const itemsTable = (items, labelHeader, valueHeader, format) =>
    items.length > 0 && (
      <DataTable
        columns={[
          { key: 'label', label: labelHeader },
          { key: 'value', label: valueHeader, numeric: true, format },
        ]}
        rows={items}
      />
    )

  const intervalLabel = { day: 'day', week: 'week', month: 'month' }[interval]

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <div className="page-header-sticky">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <h1>Reports</h1>
            </div>

            <p>Platform activity across users, pharmacies, reservations, requests and sales.</p>
          </div>

          <div className="page-header-actions reports-header-actions">
            <button
              type="button"
              className="reports-secondary-button"
              onClick={() => window.print()}
              disabled={!report}
            >
              <Printer size={16} />
              Print
            </button>

            <button
              type="button"
              className="reports-primary-button"
              onClick={handleExport}
              disabled={!report || loading}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="reports-page">
          {/* FILTERS */}

          <div className="reports-filters">
            <div className="reports-presets" role="group" aria-label="Date range">
              {RANGE_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={preset === item.id ? 'is-active' : ''}
                  aria-pressed={preset === item.id}
                  onClick={() => {
                    setPreset(item.id)

                    if (item.id === 'custom' && !customFrom && range) {
                      setCustomFrom(range.fromKey)
                      setCustomTo(range.toKey)
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="reports-custom-range">
                <CalendarRange size={16} />
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || todayKey}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  aria-label="Start date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={todayKey}
                  onChange={(event) => setCustomTo(event.target.value)}
                  aria-label="End date"
                />
              </div>
            )}

            <span className="reports-range-label">
              {rangeLabel} · grouped by {intervalLabel}
            </span>

            <button
              type="button"
              className="reports-icon-button"
              onClick={loadReport}
              disabled={loading}
              aria-label="Refresh report"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'reports-spin' : ''} />
            </button>
          </div>

          {rangeError && (
            <div className="reports-alert is-error" role="alert">
              <AlertCircle size={16} />
              <span>{rangeError}</span>
            </div>
          )}

          {source === 'partial' && (
            <div className="reports-alert is-info">
              <Info size={16} />
              <span>
                Showing users and pharmacies only. Reservation, request, prescription and
                sales reports appear once the reports endpoint is added to the server.
              </span>
            </div>
          )}

          {error ? (
            <div className="reports-state">
              <AlertCircle size={22} />
              <span>{error}</span>
              <button type="button" className="reports-secondary-button" onClick={loadReport}>
                Try again
              </button>
            </div>
          ) : !report && loading ? (
            <div className="reports-state">
              <Loader2 size={22} className="reports-spin" />
              <span>Building report...</span>
            </div>
          ) : report ? (
            <div className={loading ? 'reports-content is-refreshing' : 'reports-content'}>
              {/* KPI TILES */}

              <div className="report-stats">
                <StatTile
                  icon={Users}
                  label="Users"
                  value={formatNumber(users?.total)}
                  detail={
                    users?.newInRange !== null && users?.newInRange !== undefined
                      ? `+${formatNumber(users.newInRange)} new in range`
                      : `${formatNumber(users?.customers)} customers · ${formatNumber(users?.pharmacyAdmins)} admins`
                  }
                  unavailable={!users}
                />

                <StatTile
                  icon={Store}
                  label="Active pharmacies"
                  value={formatNumber(activePharmacies)}
                  detail={`${formatNumber(pharmacies?.total)} total · ${formatNumber(pendingPharmacies)} pending`}
                  unavailable={!pharmacies}
                />

                <StatTile
                  icon={ShoppingBag}
                  label="Reservations"
                  value={formatNumber(reservationTotal)}
                  detail={`${percent(completedReservations, reservationTotal)} completed`}
                  unavailable={!reservations}
                />

                <StatTile
                  icon={ClipboardList}
                  label="Medicine requests"
                  value={formatNumber(requests?.total)}
                  detail={
                    topMedicines[0] ? `Top: ${topMedicines[0].label}` : 'No requests in range'
                  }
                  unavailable={!requests}
                />

                <StatTile
                  icon={FileCheck2}
                  label="Prescriptions"
                  value={formatNumber(prescriptionTotal)}
                  detail={`${percent(verifiedPrescriptions, prescriptionTotal)} verified`}
                  unavailable={!prescriptions}
                />

                <StatTile
                  icon={Wallet}
                  label="Recorded sales"
                  value={formatPeso(sales?.totalAmount)}
                  detail={`${formatNumber(sales?.transactions)} transactions`}
                  unavailable={!sales}
                />
              </div>

              {/* CHARTS */}

              <div className="report-grid">
                <ChartCard
                  title="New user registrations"
                  subtitle={`Customers and pharmacy admins per ${intervalLabel}`}
                  unavailable={
                    !userSeries &&
                    'Registration dates are not included in the users list yet. Add created_at to the users endpoint to see this chart.'
                  }
                  table={seriesTable(userSeries, 'New users', formatNumber)}
                >
                  {userSeries && (
                    <ColumnChart data={userSeries} seriesLabel="New users" formatValue={formatNumber} />
                  )}
                </ChartCard>

                <ChartCard
                  title="Pharmacies by status"
                  subtitle="All registered partner pharmacies"
                  unavailable={!pharmacies && notAvailable}
                  table={itemsTable(pharmacyStatusItems, 'Status', 'Pharmacies', formatNumber)}
                >
                  <BarList items={pharmacyStatusItems} formatValue={formatNumber} emptyLabel="No pharmacies yet." />
                </ChartCard>

                <ChartCard
                  title="Reservations"
                  subtitle={`Reservations created per ${intervalLabel}`}
                  unavailable={!reservationSeries && notAvailable}
                  table={seriesTable(reservationSeries, 'Reservations', formatNumber)}
                >
                  {reservationSeries && (
                    <ColumnChart data={reservationSeries} seriesLabel="Reservations" formatValue={formatNumber} />
                  )}
                </ChartCard>

                <ChartCard
                  title="Reservations by status"
                  subtitle="Where reservations in this range ended up"
                  unavailable={!reservations && notAvailable}
                  table={itemsTable(reservationStatusItems, 'Status', 'Reservations', formatNumber)}
                >
                  <BarList items={reservationStatusItems} formatValue={formatNumber} />
                </ChartCard>

                <ChartCard
                  title="Recorded sales"
                  subtitle={`Sales recorded by pharmacies per ${intervalLabel}`}
                  unavailable={!salesSeries && notAvailable}
                  table={seriesTable(salesSeries, 'Amount', formatPeso)}
                >
                  {salesSeries && (
                    <ColumnChart
                      data={salesSeries}
                      seriesLabel="Sales"
                      formatValue={(value) => compactPeso.format(value)}
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Top pharmacies by sales"
                  subtitle="Highest recorded sales in this range"
                  unavailable={!sales && notAvailable}
                  table={itemsTable(topPharmacies, 'Pharmacy', 'Sales', formatPeso)}
                >
                  <BarList items={topPharmacies} formatValue={formatPeso} emptyLabel="No sales recorded in this range." />
                </ChartCard>

                <ChartCard
                  title="Most requested medicines"
                  subtitle="Unavailable medicines customers asked for — a signal of unmet demand"
                  unavailable={!requests && notAvailable}
                  table={itemsTable(topMedicines, 'Medicine', 'Requests', formatNumber)}
                >
                  <BarList items={topMedicines} formatValue={formatNumber} emptyLabel="No medicine requests in this range." />
                </ChartCard>

                <ChartCard
                  title="Prescription verification"
                  subtitle="Outcomes of prescriptions submitted in this range"
                  unavailable={!prescriptions && notAvailable}
                  table={itemsTable(prescriptionItems, 'Status', 'Prescriptions', formatNumber)}
                >
                  <BarList items={prescriptionItems} formatValue={formatNumber} emptyLabel="No prescriptions in this range." />
                </ChartCard>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
