// File: admin-web/src/pages/SalesPage.jsx
//
// Sales (counter transactions) for the pharmacy admin.
//
// PharmaLink only RECORDS sales. Money is collected in the
// pharmacy's own payment system / cash drawer, so this page is
// built for recording accurately and reconciling at day's end:
//   - Date presets (Today, Yesterday, Last 7 days, This month…)
//   - Filters: payment method, source (reservation / walk-in),
//     status, search
//   - Summary tiles, payment-method breakdown, top sellers
//   - Table grouped by day with daily totals
//   - CSV export of the filtered list
//   - Record sale with medicine picker, stock + price autofill,
//     and a cash change calculator (nothing is charged)
//   - Printable sale record and item-level refunds
//
// Uses shared med-* styles (MedicinesPage.css), the shared
// Modal and Select components, plus sl-* styles.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'

import './MedicinesPage.css'
import './SalesPage.css'

// =========================================================
// CONSTANTS
// =========================================================

const PAGE_SIZE = 20

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
]

const PAYMENT_COLORS = {
  CASH: '#172A3A',
  GCASH: '#508991',
  MAYA: '#74B3CE',
  CARD: '#B45309',
  BANK_TRANSFER: '#7C9A92',
  OTHER: '#94A3B8',
}

const PRESETS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_7', label: 'Last 7 days' },
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'ALL', label: 'All time' },
  { value: 'CUSTOM', label: 'Custom' },
]

const SOURCE_OPTIONS = [
  { value: 'ALL', label: 'All sources' },
  { value: 'RESERVATION', label: 'Reservation pickups' },
  { value: 'WALK_IN', label: 'Walk-in sales' },
]

const STATUS_STYLES = {
  COMPLETED: { label: 'Completed', className: 'sl-pill-completed' },
  REFUNDED: { label: 'Refunded', className: 'sl-pill-refunded' },
  PARTIALLY_REFUNDED: {
    label: 'Partly refunded',
    className: 'sl-pill-partial',
  },
}

// =========================================================
// HELPERS
// =========================================================

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function shiftDay(key, days) {
  const date = new Date(`${key}T00:00:00`)
  date.setDate(date.getDate() + days)

  return dayKey(date)
}

function rangeForPreset(preset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = dayKey(today)

  switch (preset) {
    case 'TODAY':
      return { from: todayKey, to: todayKey }
    case 'YESTERDAY': {
      const key = shiftDay(todayKey, -1)
      return { from: key, to: key }
    }
    case 'LAST_7':
      return { from: shiftDay(todayKey, -6), to: todayKey }
    case 'THIS_MONTH':
      return {
        from: dayKey(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: todayKey,
      }
    default:
      return { from: '', to: '' }
  }
}

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayLabel(key) {
  const today = dayKey(new Date())

  if (key === today) return 'Today'
  if (key === shiftDay(today, -1)) return 'Yesterday'

  const date = new Date(`${key}T00:00:00`)

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRangeLabel(range) {
  if (!range.from && !range.to) return 'all time'

  const fmt = (key) =>
    new Date(`${key}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  if (range.from && range.to && range.from === range.to) {
    return fmt(range.from)
  }

  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`
  if (range.from) return `from ${fmt(range.from)}`

  return `until ${fmt(range.to)}`
}

function paymentLabel(method) {
  return (
    PAYMENT_METHODS.find((option) => option.value === method)?.label ||
    (method
      ? String(method)
          .replaceAll('_', ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : '—')
  )
}

function getSaleCode(sale) {
  return `SALE-${String(sale.sale_id).padStart(6, '0')}`
}

function getCustomer(sale) {
  return sale.users || sale.customer || null
}

function getCustomerName(sale) {
  const customer = getCustomer(sale)

  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || 'Walk-in customer'
}

function getItems(sale) {
  return sale.sale_items || sale.items || []
}

function getMedicineName(item) {
  const medicine = item.medicines

  return (
    medicine?.brand_name ||
    medicine?.generic_name ||
    `Medicine #${item.medicine_id}`
  )
}

function getMedicineDetail(item) {
  const medicine = item.medicines

  if (!medicine) return ''

  return [
    medicine.brand_name && medicine.generic_name
      ? medicine.generic_name
      : null,
    medicine.dosage,
    medicine.dosage_form,
  ]
    .filter(Boolean)
    .join(' · ')
}

function itemSubtotal(item) {
  if (item.subtotal !== undefined && item.subtotal !== null) {
    return Number(item.subtotal) || 0
  }

  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
}

function unitCount(sale) {
  return getItems(sale).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  )
}

function itemSummary(sale) {
  const items = getItems(sale)

  if (items.length === 0) return 'No items'

  const first = `${getMedicineName(items[0])} × ${items[0].quantity ?? 1}`

  return items.length === 1 ? first : `${first} + ${items.length - 1} more`
}

function isRefunded(sale) {
  return String(sale.status || '').includes('REFUND')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatMedicineDosage(medicine) {
  const text = String(medicine?.dosage ?? '').trim()

  if (!text) return ''

  const unit = medicine?.dosage_unit

  if (!unit || /[a-z%]/i.test(text)) return text

  return `${text} ${unit}`
}

// =========================================================
// CSV EXPORT + PRINTABLE RECORD
// =========================================================

function exportSalesCsv(sales, range) {
  const header = [
    'Sale code',
    'Date',
    'Time',
    'Customer',
    'Source',
    'Reservation ID',
    'Payment method',
    'Status',
    'Items',
    'Units',
    'Total (PHP)',
  ]

  const rows = sales.map((sale) => [
    getSaleCode(sale),
    dayKey(sale.sale_date),
    formatTime(sale.sale_date),
    getCustomerName(sale),
    sale.reservation_id ? 'Reservation' : 'Walk-in',
    sale.reservation_id || '',
    paymentLabel(sale.payment_method),
    STATUS_STYLES[sale.status]?.label || sale.status || '',
    getItems(sale).length,
    unitCount(sale),
    Number(sale.total_amount || 0).toFixed(2),
  ])

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(',')
    )
    .join('\r\n')

  // BOM so Excel opens it as UTF-8
  const blob = new Blob(['﻿', csv], {
    type: 'text/csv;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `sales_${range.from || 'all'}_${range.to || 'all'}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Opens a small printable sale record. Returns false if blocked. */
function printSaleRecord(sale) {
  const win = window.open('', '_blank', 'width=420,height=640')

  if (!win) return false

  const items = getItems(sale)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(getMedicineName(item))}<br>
            <small>${escapeHtml(item.quantity)} × ${escapeHtml(
              formatPeso(item.unit_price)
            )}</small>
          </td>
          <td class="r">${escapeHtml(formatPeso(itemSubtotal(item)))}</td>
        </tr>`
    )
    .join('')

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8">
<title>${escapeHtml(getSaleCode(sale))}</title>
<style>
  body { font: 13px/1.45 system-ui, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  p { margin: 0; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 6px 0; border-bottom: 1px dashed #ccc; vertical-align: top; }
  small { color: #666; }
  .r { text-align: right; white-space: nowrap; }
  .total td { border: 0; font-weight: 700; font-size: 15px; padding-top: 10px; }
  .note { margin-top: 18px; font-size: 11px; color: #777; }
</style></head>
<body onload="window.print()">
  <h1>Sale record · ${escapeHtml(getSaleCode(sale))}</h1>
  <p>${escapeHtml(formatDateTime(sale.sale_date))}</p>
  <p>Customer: ${escapeHtml(getCustomerName(sale))}</p>
  <p>Payment: ${escapeHtml(paymentLabel(sale.payment_method))}</p>
  ${
    sale.reservation_id
      ? `<p>Reservation #${escapeHtml(sale.reservation_id)}</p>`
      : ''
  }
  <table>
    ${items}
    <tr class="total"><td>Total</td>
      <td class="r">${escapeHtml(formatPeso(sale.total_amount))}</td></tr>
  </table>
  <p class="note">Recorded in PharmaLink. This is not an official receipt.</p>
</body></html>`)

  win.document.close()
  win.focus()

  return true
}

// =========================================================
// SMALL UI PIECES
// =========================================================

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || {
    label: status
      ? String(status).replaceAll('_', ' ').toLowerCase()
      : 'Unknown',
    className: 'sl-pill-neutral',
  }

  return (
    <span className={`med-pill ${style.className}`}>{style.label}</span>
  )
}

function PaymentTag({ method }) {
  return (
    <span className="sl-pay">
      <span
        className="sl-pay-dot"
        style={{ background: PAYMENT_COLORS[method] || '#94A3B8' }}
        aria-hidden="true"
      />
      {paymentLabel(method)}
    </span>
  )
}

function Stepper({ value, onChange, min = 1, max, id, invalid, label }) {
  const number = Number(value) || 0

  return (
    <div className={`sl-stepper${invalid ? ' is-invalid' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(String(Math.max(min, number - 1)))}
        disabled={number <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus size={14} />
      </button>

      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        aria-invalid={invalid || undefined}
      />

      <button
        type="button"
        onClick={() =>
          onChange(
            String(max !== undefined ? Math.min(max, number + 1) : number + 1)
          )
        }
        disabled={max !== undefined && number >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// =========================================================
// SALE DETAILS
// =========================================================

function SaleDetailsModal({ sale, onClose, onRefund, onPrintBlocked }) {
  if (!sale) return null

  const items = getItems(sale)
  const customer = getCustomer(sale)
  const canRefund = sale.status === 'COMPLETED'

  return (
    <Modal
      open
      onClose={onClose}
      className="sl-modal-lg"
      bodyClassName="sl-modal-body"
      title={getSaleCode(sale)}
      titleAddon={<StatusPill status={sale.status} />}
      description={formatDateTime(sale.sale_date)}
      footer={
        <>
          <div className="sl-footer-left">
            <button
              type="button"
              className="med-btn med-btn-secondary"
              onClick={() => {
                if (!printSaleRecord(sale)) onPrintBlocked()
              }}
            >
              <Printer size={16} />
              Print record
            </button>

            {canRefund && (
              <button
                type="button"
                className="sl-btn-ghost-danger"
                onClick={() => onRefund(sale)}
              >
                <RotateCcw size={15} />
                Refund items
              </button>
            )}
          </div>

          <button
            type="button"
            className="med-btn med-btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </>
      }
    >
      <div className="sl-strip">
        <div>
          <span>Total</span>
          <strong>{formatPeso(sale.total_amount)}</strong>
        </div>

        <div>
          <span>Payment</span>
          <strong>
            <PaymentTag method={sale.payment_method} />
          </strong>
        </div>

        <div>
          <span>Source</span>
          <strong>
            {sale.reservation_id
              ? `Reservation #${sale.reservation_id}`
              : 'Walk-in sale'}
          </strong>
        </div>
      </div>

      <section className="sl-section">
        <h4>Customer</h4>

        <dl className="sl-dl">
          <div>
            <dt>Name</dt>
            <dd>{getCustomerName(sale)}</dd>
          </div>

          <div>
            <dt>Contact</dt>
            <dd>
              {customer?.phone || customer?.email ? (
                <>
                  {customer?.phone && (
                    <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                  )}
                  {customer?.phone && customer?.email && <br />}
                  {customer?.email && (
                    <a href={`mailto:${customer.email}`}>{customer.email}</a>
                  )}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="sl-section">
        <h4>
          Items
          <span className="sl-count">{items.length}</span>
        </h4>

        {items.length === 0 ? (
          <p className="sl-muted-text">No items on this sale.</p>
        ) : (
          <ul className="sl-items">
            {items.map((item, index) => (
              <li key={item.sale_item_id ?? index} className="sl-item">
                <div className="sl-item-main">
                  <strong>{getMedicineName(item)}</strong>
                  {getMedicineDetail(item) && (
                    <span>{getMedicineDetail(item)}</span>
                  )}
                </div>

                <span className="sl-item-qty">
                  {item.quantity} × {formatPeso(item.unit_price)}
                </span>

                <strong className="sl-item-total">
                  {formatPeso(itemSubtotal(item))}
                </strong>
              </li>
            ))}
          </ul>
        )}

        <div className="sl-total-row">
          <span>Total</span>
          <strong>{formatPeso(sale.total_amount)}</strong>
        </div>
      </section>

      <p className="sl-info">
        <Info size={15} aria-hidden="true" />
        Payment is recorded as{' '}
        <strong>{paymentLabel(sale.payment_method)}</strong>. PharmaLink
        doesn&apos;t process payments. Match this against your payment
        system.
      </p>
    </Modal>
  )
}

// =========================================================
// RECORD SALE
// =========================================================

let lineKeySeed = 0

function newLine() {
  lineKeySeed += 1

  return {
    key: lineKeySeed,
    medicine_id: '',
    quantity: '1',
    unit_price: '',
  }
}

function RecordSaleModal({ open, accessToken, pharmacyId, onClose, onSuccess }) {
  const [lines, setLines] = useState([newLine()])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [cashReceived, setCashReceived] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [reservationId, setReservationId] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [catalog, setCatalog] = useState({
    loading: true,
    error: '',
    medicines: [],
    inventory: [],
  })

  // Reset + load catalog every time the modal opens
  useEffect(() => {
    if (!open) return undefined

    setLines([newLine()])
    setPaymentMethod('CASH')
    setCashReceived('')
    setShowMore(false)
    setCustomerId('')
    setReservationId('')
    setErrors({})
    setServerError('')

    let isCurrent = true

    setCatalog((current) => ({ ...current, loading: true, error: '' }))

    Promise.all([
      apiRequest(`/medicines?pharmacy_id=${pharmacyId}`, {
        token: accessToken,
      }),
      apiRequest(`/pharmacies/${pharmacyId}/inventory`, {
        token: accessToken,
      }).catch(() => ({ data: [] })),
    ])
      .then(([medicinesResponse, inventoryResponse]) => {
        if (!isCurrent) return

        setCatalog({
          loading: false,
          error: '',
          medicines: Array.isArray(medicinesResponse?.data)
            ? medicinesResponse.data
            : [],
          inventory: Array.isArray(inventoryResponse?.data)
            ? inventoryResponse.data
            : [],
        })
      })
      .catch((requestError) => {
        if (!isCurrent) return

        setCatalog({
          loading: false,
          error: requestError.message || 'Could not load medicines.',
          medicines: [],
          inventory: [],
        })
      })

    return () => {
      isCurrent = false
    }
  }, [open, accessToken, pharmacyId])

  // Stock + suggested price per medicine (earliest-expiring batch
  // with stock first)
  const stockByMedicine = useMemo(() => {
    const map = new Map()

    catalog.inventory.forEach((batch) => {
      const key = String(batch.medicine_id)
      const entry = map.get(key) || { stock: 0, batches: [] }

      entry.stock += Number(batch.quantity) || 0
      entry.batches.push(batch)
      map.set(key, entry)
    })

    map.forEach((entry) => {
      const withStock = entry.batches
        .filter((batch) => (Number(batch.quantity) || 0) > 0)
        .sort((a, b) =>
          String(a.expiration_date || '9999').localeCompare(
            String(b.expiration_date || '9999')
          )
        )

      const pick = withStock[0] || entry.batches[0]

      entry.price =
        pick && pick.unit_price !== null && pick.unit_price !== undefined
          ? Number(pick.unit_price)
          : null
    })

    return map
  }, [catalog.inventory])

  const medicineOptions = useMemo(
    () =>
      catalog.medicines
        .filter(
          (medicine) => !medicine.status || medicine.status === 'ACTIVE'
        )
        .sort((a, b) =>
          String(a.generic_name || a.brand_name || '').localeCompare(
            String(b.generic_name || b.brand_name || '')
          )
        )
        .map((medicine) => {
          const info = stockByMedicine.get(String(medicine.medicine_id))
          const name = medicine.generic_name || medicine.brand_name

          const label =
            medicine.brand_name &&
            medicine.generic_name &&
            medicine.brand_name !== medicine.generic_name
              ? `${medicine.generic_name} (${medicine.brand_name})`
              : name || `Medicine #${medicine.medicine_id}`

          const description = [
            formatMedicineDosage(medicine),
            info ? `${formatNumber(info.stock)} in stock` : 'No stock record',
            info?.price !== null && info?.price !== undefined
              ? formatPeso(info.price)
              : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return {
            value: String(medicine.medicine_id),
            label,
            description,
          }
        }),
    [catalog.medicines, stockByMedicine]
  )

  const updateLine = (key, patch) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )

    setErrors((current) => {
      if (!current[key]) return current

      const next = { ...current }
      delete next[key]

      return next
    })
  }

  const chooseMedicine = (key, medicineId) => {
    const info = stockByMedicine.get(String(medicineId))

    updateLine(key, {
      medicine_id: String(medicineId),
      unit_price:
        info?.price !== null && info?.price !== undefined
          ? String(info.price)
          : '',
    })
  }

  const addLine = () => setLines((current) => [...current, newLine()])

  const removeLine = (key) =>
    setLines((current) =>
      current.length <= 1
        ? current
        : current.filter((line) => line.key !== key)
    )

  const lineTotal = (line) =>
    (Number(line.quantity) || 0) * (Number(line.unit_price) || 0)

  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0)

  const units = lines.reduce(
    (sum, line) => sum + (line.medicine_id ? Number(line.quantity) || 0 : 0),
    0
  )

  const filledLines = lines.filter((line) => line.medicine_id).length

  const received = Number(cashReceived)
  const hasCash = paymentMethod === 'CASH' && cashReceived !== ''
  const change = hasCash ? received - total : 0

  const validate = () => {
    const next = {}

    lines.forEach((line) => {
      const lineErrors = []

      if (!line.medicine_id) lineErrors.push('Choose a medicine.')

      if (!/^\d+$/.test(String(line.quantity)) || Number(line.quantity) < 1) {
        lineErrors.push('Quantity must be 1 or more.')
      }

      const price = Number(line.unit_price)

      if (
        String(line.unit_price).trim() === '' ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        lineErrors.push('Enter a price of 0 or more.')
      }

      if (lineErrors.length) next[line.key] = lineErrors.join(' ')
    })

    return next
  }

  const handleSubmit = async () => {
    const nextErrors = validate()

    setErrors(nextErrors)
    setServerError('')

    if (Object.keys(nextErrors).length > 0) return

    const body = {
      payment_method: paymentMethod,
      items: lines.map((line) => ({
        medicine_id: Number(line.medicine_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
      })),
    }

    if (customerId.trim()) body.customer_id = Number(customerId.trim())
    if (reservationId.trim()) {
      body.reservation_id = Number(reservationId.trim())
    }

    try {
      setIsSubmitting(true)

      const response = await apiRequest('/sales', {
        method: 'POST',
        token: accessToken,
        body,
      })

      onSuccess(
        response?.message
          ? `${response.message} · ${formatPeso(total)}`
          : `Sale recorded · ${formatPeso(total)}`
      )
    } catch (requestError) {
      setServerError(requestError.message || 'Failed to record sale.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const chosenIds = new Set(lines.map((line) => line.medicine_id))

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={isSubmitting}
      className="sl-modal-xl"
      bodyClassName="sl-modal-body"
      title="Record sale"
      description="Log a counter sale. No money is charged through PharmaLink."
      footer={
        <>
          <button
            type="button"
            className="med-btn med-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="med-btn med-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || catalog.loading || filledLines === 0}
          >
            {isSubmitting
              ? 'Recording…'
              : `Record sale · ${formatPeso(total)}`}
          </button>
        </>
      }
    >
      {serverError && (
        <p className="med-banner med-banner-error" role="alert">
          {serverError}
        </p>
      )}

      {catalog.error && (
        <p className="med-banner med-banner-error" role="alert">
          {catalog.error}
        </p>
      )}

      {/* Items */}
      <section className="sl-section">
        <div className="sl-section-head">
          <h4>
            Items
            <span className="sl-count">{filledLines}</span>
          </h4>

          <button
            type="button"
            className="med-link-btn sl-add"
            onClick={addLine}
          >
            <Plus size={15} />
            Add item
          </button>
        </div>

        <div className="sl-lines">
          <div className="sl-line sl-line-head" aria-hidden="true">
            <span>Medicine</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="sl-right">Line total</span>
            <span />
          </div>

          {lines.map((line, index) => {
            const info = line.medicine_id
              ? stockByMedicine.get(line.medicine_id)
              : null
            const quantity = Number(line.quantity) || 0
            const overStock = info && quantity > info.stock
            const noStock = line.medicine_id && (!info || info.stock <= 0)

            return (
              <div key={line.key} className="sl-line-wrap">
                <div className="sl-line">
                  <Select
                    searchable
                    size="sm"
                    aria-label={`Medicine for item ${index + 1}`}
                    placeholder={
                      catalog.loading ? 'Loading medicines…' : 'Choose medicine'
                    }
                    searchPlaceholder="Search name, brand or dosage…"
                    emptyText="No medicines match"
                    value={line.medicine_id}
                    onChange={(value) => chooseMedicine(line.key, value)}
                    options={medicineOptions.filter(
                      (option) =>
                        option.value === line.medicine_id ||
                        !chosenIds.has(option.value)
                    )}
                    disabled={catalog.loading}
                    invalid={Boolean(errors[line.key] && !line.medicine_id)}
                  />

                  <Stepper
                    label={`quantity for item ${index + 1}`}
                    value={line.quantity}
                    onChange={(value) =>
                      updateLine(line.key, { quantity: value })
                    }
                  />

                  <div className="sl-money">
                    <span aria-hidden="true">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="med-input"
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unit_price: event.target.value,
                        })
                      }
                      placeholder="0.00"
                      aria-label={`Unit price for item ${index + 1}`}
                    />
                  </div>

                  <strong className="sl-line-total">
                    {formatPeso(lineTotal(line))}
                  </strong>

                  <button
                    type="button"
                    className="sl-icon-btn"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length <= 1}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {errors[line.key] ? (
                  <p className="med-field-error">{errors[line.key]}</p>
                ) : noStock ? (
                  <p className="sl-warning">
                    No stock recorded for this medicine. Check Inventory.
                  </p>
                ) : overStock ? (
                  <p className="sl-warning">
                    Only {formatNumber(info.stock)} in stock.
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {/* Payment + totals */}
      <div className="sl-checkout">
        <section className="sl-section">
          <h4>Payment</h4>

          <div className="med-field">
            <label
              className="med-label"
              id="sl-payment-label"
              htmlFor="sl-payment"
            >
              How the customer paid
            </label>

            <Select
              id="sl-payment"
              aria-labelledby="sl-payment-label"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS}
            />

            <p className="sl-hint">
              For your records only. Collect payment in your own system.
            </p>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="med-field">
              <label className="med-label" htmlFor="sl-cash">
                Cash received
                <span className="med-optional">For change</span>
              </label>

              <div className="sl-money">
                <span aria-hidden="true">₱</span>
                <input
                  id="sl-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="med-input"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </section>

        <div className="sl-summary-box" aria-live="polite">
          <div>
            <span>Items</span>
            <strong>
              {filledLines} · {formatNumber(units)} unit
              {units === 1 ? '' : 's'}
            </strong>
          </div>

          <div className="sl-summary-total">
            <span>Total</span>
            <strong>{formatPeso(total)}</strong>
          </div>

          {hasCash && (
            <div
              className={`sl-change${change < 0 ? ' is-short' : ''}`}
            >
              <span>{change < 0 ? 'Short by' : 'Change'}</span>
              <strong>{formatPeso(Math.abs(change))}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Optional links */}
      <div className="sl-more">
        <button
          type="button"
          className="med-link-btn"
          onClick={() => setShowMore((current) => !current)}
          aria-expanded={showMore}
        >
          {showMore ? 'Hide' : 'Link to a customer or reservation'}
        </button>

        {showMore && (
          <div className="sl-more-grid">
            <div className="med-field">
              <label className="med-label" htmlFor="sl-customer">
                Customer ID
                <span className="med-optional">Optional</span>
              </label>
              <input
                id="sl-customer"
                type="number"
                min="1"
                className="med-input"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder="Leave blank for walk-in"
              />
            </div>

            <div className="med-field">
              <label className="med-label" htmlFor="sl-reservation">
                Reservation ID
                <span className="med-optional">Optional</span>
              </label>
              <input
                id="sl-reservation"
                type="number"
                min="1"
                className="med-input"
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}
                placeholder="Usually done from Reservations → Complete"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// =========================================================
// REFUND
// =========================================================

function RefundSaleModal({ sale, accessToken, onClose, onSuccess }) {
  const [selections, setSelections] = useState({})
  const [refundMethod, setRefundMethod] = useState('CASH')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!sale) return

    setSelections({})
    setReason('')
    setError('')
    setRefundMethod(
      PAYMENT_METHODS.some((option) => option.value === sale.payment_method)
        ? sale.payment_method
        : 'CASH'
    )
  }, [sale])

  if (!sale) return null

  const items = getItems(sale)
  const allSelected =
    items.length > 0 &&
    items.every((item) => selections[item.sale_item_id] !== undefined)

  const toggleItem = (item) => {
    setSelections((current) => {
      const next = { ...current }

      if (next[item.sale_item_id] !== undefined) {
        delete next[item.sale_item_id]
      } else {
        next[item.sale_item_id] = Number(item.quantity) || 1
      }

      return next
    })
  }

  const toggleAll = () => {
    setSelections(
      allSelected
        ? {}
        : Object.fromEntries(
            items.map((item) => [
              item.sale_item_id,
              Number(item.quantity) || 1,
            ])
          )
    )
  }

  const setQuantity = (item, value) => {
    const max = Number(item.quantity) || 1
    let quantity = Number(value)

    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1
    if (quantity > max) quantity = max

    setSelections((current) => ({
      ...current,
      [item.sale_item_id]: quantity,
    }))
  }

  const refundTotal = items.reduce((sum, item) => {
    const quantity = selections[item.sale_item_id]

    return quantity ? sum + quantity * Number(item.unit_price || 0) : sum
  }, 0)

  const selectedCount = Object.keys(selections).length

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      setError('Select at least one item to refund.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      const response = await apiRequest(
        `/refunds/sales/${sale.sale_id}/refund`,
        {
          method: 'POST',
          token: accessToken,
          body: {
            refund_method: refundMethod,
            reason: reason.trim() || null,
            items: Object.entries(selections).map(
              ([saleItemId, quantity]) => ({
                sale_item_id: Number(saleItemId),
                quantity: Number(quantity),
              })
            ),
          },
        }
      )

      onSuccess(
        response?.data?.refund_id
          ? `Refund #${response.data.refund_id} recorded · ${formatPeso(
              response.data.amount
            )}`
          : `Refund recorded · ${formatPeso(refundTotal)}`
      )
    } catch (requestError) {
      setError(requestError.message || 'Failed to record refund.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={isSubmitting}
      className="sl-modal-lg"
      bodyClassName="sl-modal-body"
      title={`Refund ${getSaleCode(sale)}`}
      description="Record items returned by the customer. Hand back the money through your own payment system."
      footer={
        <>
          <button
            type="button"
            className="med-btn med-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="med-btn sl-btn-danger"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCount === 0}
          >
            {isSubmitting
              ? 'Recording…'
              : `Record refund · ${formatPeso(refundTotal)}`}
          </button>
        </>
      }
    >
      {error && (
        <p className="med-banner med-banner-error" role="alert">
          {error}
        </p>
      )}

      <section className="sl-section">
        <div className="sl-section-head">
          <h4>Items to refund</h4>

          <label className="sl-check-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            Select all
          </label>
        </div>

        <ul className="sl-refund-list">
          {items.map((item) => {
            const isSelected = selections[item.sale_item_id] !== undefined
            const quantity = selections[item.sale_item_id] ?? item.quantity

            return (
              <li
                key={item.sale_item_id}
                className={`sl-refund-item${isSelected ? ' is-selected' : ''}`}
              >
                <label className="sl-refund-check">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item)}
                    aria-label={`Refund ${getMedicineName(item)}`}
                  />
                </label>

                <div className="sl-item-main">
                  <strong>{getMedicineName(item)}</strong>
                  <span>
                    Sold {item.quantity} × {formatPeso(item.unit_price)}
                  </span>
                </div>

                {isSelected ? (
                  <Stepper
                    label={`refund quantity for ${getMedicineName(item)}`}
                    value={String(quantity)}
                    min={1}
                    max={Number(item.quantity) || 1}
                    onChange={(value) => setQuantity(item, value)}
                  />
                ) : (
                  <span className="sl-muted-text">Not refunded</span>
                )}

                <strong className="sl-item-total">
                  {isSelected
                    ? formatPeso(quantity * Number(item.unit_price || 0))
                    : formatPeso(0)}
                </strong>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="sl-more-grid">
        <div className="med-field">
          <label
            className="med-label"
            id="sl-refund-method-label"
            htmlFor="sl-refund-method"
          >
            Refunded via
          </label>

          <Select
            id="sl-refund-method"
            aria-labelledby="sl-refund-method-label"
            value={refundMethod}
            onChange={setRefundMethod}
            options={PAYMENT_METHODS}
          />
        </div>

        <div className="med-field">
          <label className="med-label" htmlFor="sl-refund-reason">
            Reason
            <span className="med-optional">Optional</span>
          </label>

          <input
            id="sl-refund-reason"
            className="med-input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g., Wrong medicine dispensed"
            maxLength={300}
          />
        </div>
      </div>
    </Modal>
  )
}

// =========================================================
// INSIGHT CARDS
// =========================================================

function PaymentMix({ sales }) {
  const rows = useMemo(() => {
    const map = new Map()

    sales.forEach((sale) => {
      const key = sale.payment_method || 'OTHER'
      const entry = map.get(key) || { method: key, total: 0, count: 0 }

      entry.total += Number(sale.total_amount || 0)
      entry.count += 1
      map.set(key, entry)
    })

    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [sales])

  const grand = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <section className="sl-card">
      <header className="sl-card-head">
        <h3>By payment method</h3>
        <p>Use this to match your cash drawer and e-wallet totals.</p>
      </header>

      {rows.length === 0 ? (
        <p className="sl-muted-text sl-card-empty">No sales in this view.</p>
      ) : (
        <>
          <div className="sl-mix-bar" aria-hidden="true">
            {rows.map((row) => (
              <span
                key={row.method}
                style={{
                  width: `${grand ? (row.total / grand) * 100 : 0}%`,
                  background: PAYMENT_COLORS[row.method] || '#94A3B8',
                }}
              />
            ))}
          </div>

          <ul className="sl-mix-list">
            {rows.map((row) => (
              <li key={row.method}>
                <PaymentTag method={row.method} />
                <span className="sl-mix-count">
                  {row.count} sale{row.count === 1 ? '' : 's'}
                </span>
                <strong>{formatPeso(row.total)}</strong>
                <span className="sl-mix-share">
                  {grand ? Math.round((row.total / grand) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function TopSellers({ sales }) {
  const rows = useMemo(() => {
    const map = new Map()

    sales.forEach((sale) => {
      getItems(sale).forEach((item) => {
        const key = String(item.medicine_id)
        const entry = map.get(key) || {
          id: key,
          name: getMedicineName(item),
          detail: getMedicineDetail(item),
          units: 0,
          revenue: 0,
        }

        entry.units += Number(item.quantity) || 0
        entry.revenue += itemSubtotal(item)
        map.set(key, entry)
      })
    })

    return [...map.values()]
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 5)
  }, [sales])

  const max = rows[0]?.units || 0

  return (
    <section className="sl-card">
      <header className="sl-card-head">
        <h3>Top sellers</h3>
        <p>Most units sold in this view.</p>
      </header>

      {rows.length === 0 ? (
        <p className="sl-muted-text sl-card-empty">No items sold yet.</p>
      ) : (
        <ol className="sl-top-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="sl-top-row">
                <span className="sl-top-name" title={row.name}>
                  {row.name}
                </span>
                <span className="sl-top-meta">
                  {formatNumber(row.units)} units · {formatPeso(row.revenue)}
                </span>
              </div>

              <span className="sl-top-bar" aria-hidden="true">
                <span
                  style={{ width: `${max ? (row.units / max) * 100 : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// =========================================================
// PAGE
// =========================================================

function SalesPage() {
  const { accessToken, user } = useAuth()
  const pharmacyId = user?.pharmacy_id

  const [sales, setSales] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [pageError, setPageError] = useState('')

  // Date range
  const [preset, setPreset] = useState('LAST_7')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [selectedSale, setSelectedSale] = useState(null)
  const [refundingSale, setRefundingSale] = useState(null)
  const [isRecordOpen, setIsRecordOpen] = useState(false)

  const range = useMemo(
    () =>
      preset === 'CUSTOM'
        ? { from: customFrom, to: customTo }
        : rangeForPreset(preset),
    [preset, customFrom, customTo]
  )

  const rangeInvalid = Boolean(
    range.from && range.to && range.from > range.to
  )

  // -------------------------------------------------------
  // Load (server filter is widened by a day on each side to
  // cover time zones; the exact local-day filter runs below)
  // -------------------------------------------------------

  const loadSales = useCallback(
    async ({ silent = false } = {}) => {
      if (!accessToken || rangeInvalid) return

      if (!silent) setIsLoading(true)

      try {
        const params = new URLSearchParams()

        if (range.from) params.set('from', shiftDay(range.from, -1))
        if (range.to) params.set('to', shiftDay(range.to, 1))

        const query = params.toString()

        const response = await apiRequest(
          `/sales/pharmacy${query ? `?${query}` : ''}`,
          { token: accessToken }
        )

        setSales(Array.isArray(response?.data) ? response.data : [])
        setLoadError('')
      } catch (requestError) {
        setLoadError(requestError.message || 'Failed to load sales.')
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, range.from, range.to, rangeInvalid]
  )

  useEffect(() => {
    loadSales()
  }, [loadSales])

  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => setNotice(''), 6000)

    return () => window.clearTimeout(timer)
  }, [notice])

  // -------------------------------------------------------
  // Filtering
  // -------------------------------------------------------

  const salesInRange = useMemo(
    () =>
      sales.filter((sale) => {
        const key = dayKey(sale.sale_date)

        if (range.from && key < range.from) return false
        if (range.to && key > range.to) return false

        return true
      }),
    [sales, range.from, range.to]
  )

  const statusOptions = useMemo(() => {
    const present = [
      ...new Set(salesInRange.map((sale) => sale.status).filter(Boolean)),
    ]

    return [
      { value: 'ALL', label: 'All statuses' },
      ...present.map((status) => ({
        value: status,
        label:
          STATUS_STYLES[status]?.label ||
          String(status).replaceAll('_', ' ').toLowerCase(),
      })),
    ]
  }, [salesInRange])

  const paymentOptions = useMemo(
    () => [{ value: 'ALL', label: 'All payment methods' }, ...PAYMENT_METHODS],
    []
  )

  const hasFilters =
    searchTerm.trim() !== '' ||
    paymentFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    statusFilter !== 'ALL'

  const clearFilters = () => {
    setSearchTerm('')
    setPaymentFilter('ALL')
    setSourceFilter('ALL')
    setStatusFilter('ALL')
  }

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return salesInRange
      .filter((sale) => {
        if (term) {
          const customer = getCustomer(sale)

          const haystack = [
            getSaleCode(sale),
            String(sale.sale_id),
            getCustomerName(sale),
            customer?.email,
            customer?.phone,
            sale.reservation_id ? `reservation ${sale.reservation_id}` : '',
            paymentLabel(sale.payment_method),
            ...getItems(sale).map(getMedicineName),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (!haystack.includes(term)) return false
        }

        if (paymentFilter !== 'ALL' && sale.payment_method !== paymentFilter) {
          return false
        }

        if (sourceFilter === 'RESERVATION' && !sale.reservation_id) return false
        if (sourceFilter === 'WALK_IN' && sale.reservation_id) return false

        if (statusFilter !== 'ALL' && sale.status !== statusFilter) {
          return false
        }

        return true
      })
      .sort(
        (a, b) =>
          new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      )
  }, [salesInRange, searchTerm, paymentFilter, sourceFilter, statusFilter])

  // -------------------------------------------------------
  // Summary
  // -------------------------------------------------------

  const summary = useMemo(() => {
    const gross = filteredSales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    )

    const units = filteredSales.reduce((sum, sale) => sum + unitCount(sale), 0)

    const fromReservations = filteredSales.filter(
      (sale) => sale.reservation_id
    ).length

    return {
      gross,
      count: filteredSales.length,
      average: filteredSales.length ? gross / filteredSales.length : 0,
      units,
      fromReservations,
      refunded: filteredSales.filter(isRefunded).length,
    }
  }, [filteredSales])

  const dayTotals = useMemo(() => {
    const map = new Map()

    filteredSales.forEach((sale) => {
      const key = dayKey(sale.sale_date)
      const entry = map.get(key) || { count: 0, total: 0 }

      entry.count += 1
      entry.total += Number(sale.total_amount || 0)
      map.set(key, entry)
    })

    return map
  }, [filteredSales])

  // -------------------------------------------------------
  // Pagination + day groups
  // -------------------------------------------------------

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, paymentFilter, sourceFilter, statusFilter, range.from, range.to])

  const totalPages = Math.max(Math.ceil(filteredSales.length / PAGE_SIZE), 1)
  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * PAGE_SIZE

  const pageSales = filteredSales.slice(startIndex, startIndex + PAGE_SIZE)

  const groups = []

  pageSales.forEach((sale) => {
    const key = dayKey(sale.sale_date)
    const last = groups[groups.length - 1]

    if (!last || last.key !== key) groups.push({ key, sales: [sale] })
    else last.sales.push(sale)
  })

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (number) =>
      number === 1 || number === totalPages || Math.abs(number - page) <= 1
  )

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <>
      <div className="page-header-sticky">
        <div>
          <h2 className="page-title">Sales</h2>
          <p className="page-copy">
            Record counter sales and reconcile them with your payment
            system.
          </p>
        </div>

        <div className="sl-header-actions">
          <button
            type="button"
            className="med-btn med-btn-secondary"
            onClick={() => exportSalesCsv(filteredSales, range)}
            disabled={filteredSales.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            className="med-btn med-btn-primary"
            onClick={() => {
              setNotice('')
              setPageError('')
              setIsRecordOpen(true)
            }}
          >
            <Plus size={18} />
            Record sale
          </button>
        </div>
      </div>

      <div className="page-content-wrapper">
        <section className="med-page sl-page">
          {loadError && (
            <p className="med-banner med-banner-error" role="alert">
              {loadError}
            </p>
          )}

          {pageError && (
            <p className="med-banner med-banner-error" role="alert">
              {pageError}
              <button
                type="button"
                className="med-banner-close"
                onClick={() => setPageError('')}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </p>
          )}

          {notice && (
            <p className="med-banner med-banner-success" role="status">
              {notice}
              <button
                type="button"
                className="med-banner-close"
                onClick={() => setNotice('')}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </p>
          )}

          {/* Date range */}
          <div className="sl-range">
            <div className="sl-chips" role="group" aria-label="Date range">
              {PRESETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`sl-chip${preset === option.value ? ' is-active' : ''}`}
                  aria-pressed={preset === option.value}
                  onClick={() => {
                    if (option.value === 'CUSTOM' && preset !== 'CUSTOM') {
                      const current = rangeForPreset(preset)
                      setCustomFrom(current.from)
                      setCustomTo(current.to)
                    }

                    setPreset(option.value)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preset === 'CUSTOM' && (
              <div className="sl-custom-range">
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    className="med-input"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </label>

                <label>
                  <span>To</span>
                  <input
                    type="date"
                    className="med-input"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </label>
              </div>
            )}

            <p className="sl-range-label">
              {rangeInvalid
                ? 'The start date is after the end date.'
                : `Showing ${formatRangeLabel(range)}`}
            </p>
          </div>

          {/* Summary tiles */}
          <div className="sl-tiles">
            <article className="sl-tile sl-tile-primary">
              <span>Gross sales</span>
              <strong>{isLoading ? '—' : formatPeso(summary.gross)}</strong>
              <small>
                {summary.refunded > 0
                  ? `Includes ${summary.refunded} refunded sale${
                      summary.refunded === 1 ? '' : 's'
                    }`
                  : 'Before refunds'}
              </small>
            </article>

            <article className="sl-tile">
              <span>Transactions</span>
              <strong>{isLoading ? '—' : formatNumber(summary.count)}</strong>
              <small>
                {formatNumber(summary.fromReservations)} from reservations
              </small>
            </article>

            <article className="sl-tile">
              <span>Average sale</span>
              <strong>{isLoading ? '—' : formatPeso(summary.average)}</strong>
              <small>per transaction</small>
            </article>

            <article className="sl-tile">
              <span>Units sold</span>
              <strong>{isLoading ? '—' : formatNumber(summary.units)}</strong>
              <small>across all items</small>
            </article>
          </div>

          {/* Insights */}
          {!isLoading && (
            <div className="sl-insights">
              <PaymentMix sales={filteredSales} />
              <TopSellers sales={filteredSales} />
            </div>
          )}

          {/* Table */}
          <div className="med-card">
            <div className="med-toolbar sl-toolbar">
              <div className="med-search">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search sale code, customer, phone or medicine…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search sales"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="med-search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <Select
                size="sm"
                aria-label="Filter by payment method"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={paymentOptions}
              />

              <Select
                size="sm"
                aria-label="Filter by source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={SOURCE_OPTIONS}
              />

              <Select
                size="sm"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
            </div>

            {!isLoading && salesInRange.length > 0 && (
              <div className="med-summary">
                <span>
                  {filteredSales.length === 0
                    ? 'No sales match'
                    : `Showing ${startIndex + 1}–${Math.min(
                        startIndex + PAGE_SIZE,
                        filteredSales.length
                      )} of ${filteredSales.length} sale${
                        filteredSales.length === 1 ? '' : 's'
                      }`}
                  {hasFilters && ` · filtered from ${salesInRange.length}`}
                </span>

                {hasFilters && (
                  <button
                    type="button"
                    className="med-link-btn"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="med-state">
                <p>Loading sales…</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="med-state">
                <h3>
                  {hasFilters
                    ? 'No matching sales'
                    : `No sales for ${formatRangeLabel(range)}`}
                </h3>

                <p>
                  {hasFilters
                    ? 'Try a different search or clear the filters.'
                    : 'Record a counter sale, or pick a wider date range.'}
                </p>

                {hasFilters ? (
                  <button
                    type="button"
                    className="med-btn med-btn-secondary"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="med-btn med-btn-primary"
                    onClick={() => setIsRecordOpen(true)}
                  >
                    <Plus size={18} />
                    Record sale
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="med-table-scroll">
                  <table className="med-table sl-table">
                    <thead>
                      <tr>
                        <th scope="col">Sale</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Items</th>
                        <th scope="col">Payment</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="sl-right">
                          Total
                        </th>
                        <th scope="col" className="med-col-actions">
                          <span className="med-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    {groups.map((group) => {
                      const totals = dayTotals.get(group.key)

                      return (
                        <tbody key={group.key}>
                          <tr className="sl-day-row">
                            <th scope="rowgroup" colSpan={5}>
                              {formatDayLabel(group.key)}
                            </th>
                            <td colSpan={2} className="sl-right">
                              {totals?.count ?? 0} sale
                              {totals?.count === 1 ? '' : 's'} ·{' '}
                              <strong>{formatPeso(totals?.total)}</strong>
                            </td>
                          </tr>

                          {group.sales.map((sale) => (
                            <tr
                              key={sale.sale_id}
                              className={isRefunded(sale) ? 'sl-row-muted' : ''}
                            >
                              <td>
                                <div className="med-name">
                                  <strong>{getSaleCode(sale)}</strong>
                                  <span>{formatTime(sale.sale_date)}</span>
                                </div>
                              </td>

                              <td>
                                <div className="med-name">
                                  <strong>{getCustomerName(sale)}</strong>
                                  <span>
                                    {sale.reservation_id
                                      ? `Reservation #${sale.reservation_id}`
                                      : 'Walk-in sale'}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <div className="med-name sl-items-cell">
                                  <strong>{itemSummary(sale)}</strong>
                                  <span>
                                    {formatNumber(unitCount(sale))} unit
                                    {unitCount(sale) === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <PaymentTag method={sale.payment_method} />
                              </td>

                              <td>
                                <StatusPill status={sale.status} />
                              </td>

                              <td className="sl-right sl-amount">
                                {formatPeso(sale.total_amount)}
                              </td>

                              <td className="med-col-actions">
                                <button
                                  type="button"
                                  className="med-action"
                                  onClick={() => setSelectedSale(sale)}
                                  aria-label={`View ${getSaleCode(sale)}`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      )
                    })}
                  </table>
                </div>

                {totalPages > 1 && (
                  <nav className="med-pagination" aria-label="Sales pages">
                    <span>
                      Page {page} of {totalPages}
                    </span>

                    <div className="med-pages">
                      <button
                        type="button"
                        className="med-page-btn"
                        onClick={() => setCurrentPage(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      {pageNumbers.map((number, index) => (
                        <span key={number} className="med-page-group">
                          {index > 0 && number - pageNumbers[index - 1] > 1 && (
                            <span className="med-ellipsis">…</span>
                          )}

                          <button
                            type="button"
                            className={`med-page-btn${
                              number === page ? ' is-current' : ''
                            }`}
                            onClick={() => setCurrentPage(number)}
                            aria-current={number === page ? 'page' : undefined}
                          >
                            {number}
                          </button>
                        </span>
                      ))}

                      <button
                        type="button"
                        className="med-page-btn"
                        onClick={() => setCurrentPage(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <SaleDetailsModal
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onRefund={(sale) => {
          setSelectedSale(null)
          setRefundingSale(sale)
        }}
        onPrintBlocked={() =>
          setPageError(
            'Your browser blocked the print window. Allow pop-ups for this site and try again.'
          )
        }
      />

      <RefundSaleModal
        sale={refundingSale}
        accessToken={accessToken}
        onClose={() => setRefundingSale(null)}
        onSuccess={(message) => {
          setRefundingSale(null)
          setNotice(message)
          loadSales({ silent: true })
        }}
      />

      <RecordSaleModal
        open={isRecordOpen}
        accessToken={accessToken}
        pharmacyId={pharmacyId}
        onClose={() => setIsRecordOpen(false)}
        onSuccess={(message) => {
          setIsRecordOpen(false)
          setNotice(message)
          loadSales({ silent: true })
        }}
      />
    </>
  )
}

export default SalesPage