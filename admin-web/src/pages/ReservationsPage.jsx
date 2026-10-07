// File: admin-web/src/pages/ReservationsPage.jsx
//
// Reservations for the pharmacy admin.
// - Status tabs with counts (replace the summary cards)
// - Search + pickup-date filter
// - Table with one clear next action per row
// - Details modal; Cancel / No-show / Complete open a styled
//   confirm dialog (no more browser prompt/confirm boxes)
//
// Shares table, button, banner and modal styles (med-*) with
// the Medicines page, plus reservation-only styles (rsv-*).

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'

import './MedicinesPage.css'
import './ReservationsPage.css'

// =========================================================
// CONSTANTS
// =========================================================

const ITEMS_PER_PAGE = 10

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
]

const DATE_OPTIONS = [
  { value: 'ALL', label: 'All pickup dates' },
  { value: 'TODAY', label: 'Today' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PAST', label: 'Past' },
]

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_PILL = {
  PENDING: { label: 'Pending', className: 'rsv-pill-pending' },
  CONFIRMED: { label: 'Confirmed', className: 'rsv-pill-confirmed' },
  COMPLETED: { label: 'Completed', className: 'rsv-pill-completed' },
  CANCELLED: { label: 'Cancelled', className: 'rsv-pill-cancelled' },
  EXPIRED: { label: 'Expired', className: 'rsv-pill-expired' },
}

const OPEN_STATUSES = ['PENDING', 'CONFIRMED']

// =========================================================
// HELPERS
// =========================================================

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : ''
}

function timeOnly(value) {
  return value ? String(value).slice(0, 5) : ''
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(value) {
  const key = dateOnly(value)

  if (!key) return '—'

  const date = new Date(`${key}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPickupDay(value) {
  const key = dateOnly(value)

  if (!key) return '—'

  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (key === localDayKey(today)) return 'Today'
  if (key === localDayKey(tomorrow)) return 'Tomorrow'

  return formatDate(key)
}

function formatTime(value) {
  const text = timeOnly(value)

  if (!text) return '—'

  const [hours, minutes] = text.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return text

  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${
    hours >= 12 ? 'PM' : 'AM'
  }`
}

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Pickup date/time is now or earlier (browser local time). */
function hasPickupPassed(reservation) {
  const day = dateOnly(reservation.pickup_date)
  const time = timeOnly(reservation.pickup_time)
  const today = localDayKey()
  const now = new Date().toTimeString().slice(0, 5)

  if (!day) return false

  return day < today || (day === today && (!time || time <= now))
}

function getCustomer(reservation) {
  return reservation.users || reservation.customer || null
}

function getCustomerName(reservation) {
  const customer = getCustomer(reservation)

  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || `Customer #${reservation.customer_id}`
}

function getItems(reservation) {
  return reservation.reservation_items || reservation.items || []
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

function lineTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
}

function reservationTotal(reservation) {
  return getItems(reservation).reduce(
    (sum, item) => sum + lineTotal(item),
    0
  )
}

function itemSummary(reservation) {
  const items = getItems(reservation)

  if (items.length === 0) return 'No items'

  const first = `${getMedicineName(items[0])} × ${items[0].quantity ?? 1}`

  return items.length === 1
    ? first
    : `${first} + ${items.length - 1} more`
}

// =========================================================
// ICONS
// =========================================================

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function StatusPill({ status }) {
  const pill = STATUS_PILL[status] || {
    label: status || 'Unknown',
    className: 'rsv-pill-expired',
  }

  return (
    <span className={`med-pill ${pill.className}`}>{pill.label}</span>
  )
}

// =========================================================
// DETAILS MODAL
// =========================================================

function ReservationDetails({
  reservation,
  busy,
  error,
  onClose,
  onConfirm,
  onRequestAction,
}) {
  if (!reservation) return null

  const customer = getCustomer(reservation)
  const items = getItems(reservation)
  const total = reservationTotal(reservation)
  const isOpen = OPEN_STATUSES.includes(reservation.status)
  const pickupPassed = hasPickupPassed(reservation)
  const isLate = isOpen && pickupPassed

  const footer = (
    <>
      {isOpen && (
        <div className="rsv-footer-left">
          <button
            type="button"
            className="rsv-btn-ghost-danger"
            onClick={() => onRequestAction('cancel', reservation)}
            disabled={busy}
          >
            Cancel reservation
          </button>

          <button
            type="button"
            className="rsv-btn-ghost-danger"
            onClick={() => onRequestAction('noshow', reservation)}
            disabled={busy || !pickupPassed}
            title={
              pickupPassed
                ? undefined
                : 'Available after the pickup time'
            }
          >
            No-show
          </button>
        </div>
      )}

      <button
        type="button"
        className="med-btn med-btn-secondary"
        onClick={onClose}
        disabled={busy}
      >
        Close
      </button>

      {reservation.status === 'PENDING' && (
        <button
          type="button"
          className="med-btn med-btn-primary"
          onClick={() => onConfirm(reservation)}
          disabled={busy}
        >
          {busy ? 'Confirming…' : 'Confirm reservation'}
        </button>
      )}

      {reservation.status === 'CONFIRMED' && (
        <button
          type="button"
          className="med-btn med-btn-primary"
          onClick={() => onRequestAction('complete', reservation)}
          disabled={busy}
        >
          Complete pickup
        </button>
      )}
    </>
  )

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={busy}
      className="rsv-modal-lg"
      bodyClassName="rsv-modal-body"
      title={`Reservation #${reservation.reservation_id}`}
      titleAddon={<StatusPill status={reservation.status} />}
      description={`Reserved ${formatDate(
        reservation.reservation_date || reservation.created_at
      )}`}
      footer={footer}
    >
      {error && (
        <p className="med-banner med-banner-error" role="alert">
          {error}
        </p>
      )}

      {/* Key facts */}
      <div className="rsv-strip">
        <div>
          <span>Pickup</span>
          <strong>
            {formatPickupDay(reservation.pickup_date)} ·{' '}
            {formatTime(reservation.pickup_time)}
          </strong>
          {isLate && <em className="rsv-late">Past pickup time</em>}
        </div>

        <div>
          <span>Customer</span>
          <strong>{getCustomerName(reservation)}</strong>
        </div>

        <div>
          <span>Estimated total</span>
          <strong>{formatPeso(total)}</strong>
        </div>
      </div>

      {/* Contact + details */}
      <section className="rsv-section">
        <h4>Contact</h4>

        <dl className="rsv-dl">
          <div>
            <dt>Email</dt>
            <dd>
              {customer?.email ? (
                <a href={`mailto:${customer.email}`}>{customer.email}</a>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div>
            <dt>Phone</dt>
            <dd>
              {customer?.phone ? (
                <a href={`tel:${customer.phone}`}>{customer.phone}</a>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div>
            <dt>Pickup date</dt>
            <dd>{formatDate(reservation.pickup_date)}</dd>
          </div>

          <div>
            <dt>Prescription</dt>
            <dd>
              {reservation.prescription_id
                ? `Attached (#${reservation.prescription_id})`
                : 'Not attached'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Note */}
      {reservation.notes && (
        <section className="rsv-section">
          <h4>Customer note</h4>
          <blockquote className="rsv-note">{reservation.notes}</blockquote>
        </section>
      )}

      {/* Items */}
      <section className="rsv-section">
        <h4>
          Reserved medicines
          <span className="rsv-count">
            {items.length} item{items.length === 1 ? '' : 's'}
          </span>
        </h4>

        {items.length === 0 ? (
          <p className="rsv-empty">No medicine items found.</p>
        ) : (
          <ul className="rsv-items">
            {items.map((item, index) => (
              <li
                key={item.reservation_item_id ?? index}
                className="rsv-item"
              >
                <div className="rsv-item-main">
                  <strong>{getMedicineName(item)}</strong>

                  {getMedicineDetail(item) && (
                    <span>{getMedicineDetail(item)}</span>
                  )}

                  {item.medicines?.requires_prescription && (
                    <span className="med-pill rsv-pill-pending rsv-rx">
                      Rx required
                    </span>
                  )}
                </div>

                <span className="rsv-item-qty">
                  {item.quantity} × {formatPeso(item.unit_price)}
                </span>

                <strong className="rsv-item-total">
                  {formatPeso(lineTotal(item))}
                </strong>
              </li>
            ))}
          </ul>
        )}

        <div className="rsv-total">
          <span>Estimated total</span>
          <strong>{formatPeso(total)}</strong>
        </div>
      </section>
    </Modal>
  )
}

// =========================================================
// ACTION DIALOG (cancel / no-show / complete)
// =========================================================

function ActionDialog({ dialog, busy, error, onClose, onSubmit }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  useEffect(() => {
    if (dialog) setPaymentMethod('CASH')
  }, [dialog])

  if (!dialog) return null

  const { type, reservation } = dialog
  const id = reservation.reservation_id
  const name = getCustomerName(reservation)
  const total = reservationTotal(reservation)

  const config = {
    cancel: {
      title: `Cancel reservation #${id}?`,
      description: `${name} will be notified.`,
      confirmLabel: 'Cancel reservation',
      busyLabel: 'Cancelling…',
      tone: 'danger',
      body: (
        <p className="rsv-dialog-text">
          The reserved stock goes back to inventory. This can&apos;t
          be undone.
        </p>
      ),
    },
    noshow: {
      title: `Mark #${id} as no-show?`,
      description: `${name} didn't pick up.`,
      confirmLabel: 'Mark as no-show',
      busyLabel: 'Saving…',
      tone: 'danger',
      body: (
        <p className="rsv-dialog-text">
          The reservation becomes <strong>Expired</strong>, the
          reserved stock goes back to inventory, and the customer is
          notified.
        </p>
      ),
    },
    complete: {
      title: `Complete pickup #${id}`,
      description: `Record the sale for ${name}.`,
      confirmLabel: 'Record sale',
      busyLabel: 'Recording…',
      tone: 'primary',
      body: (
        <>
          <div className="rsv-dialog-total">
            <span>Amount to collect</span>
            <strong>{formatPeso(total)}</strong>
          </div>

          <div className="med-field">
            <label
              className="med-label"
              id="rsv-payment-label"
              htmlFor="rsv-payment"
            >
              Payment method
            </label>

            <Select
              id="rsv-payment"
              aria-labelledby="rsv-payment-label"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_OPTIONS}
            />
          </div>
        </>
      ),
    },
  }[type]

  if (!config) return null

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={busy}
      className="rsv-modal-sm"
      bodyClassName="rsv-dialog-body"
      title={config.title}
      description={config.description}
      footer={
        <>
          <button
            type="button"
            className="med-btn med-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {type === 'complete' ? 'Not yet' : 'Keep reservation'}
          </button>

          <button
            type="button"
            className={`med-btn ${
              config.tone === 'danger' ? 'rsv-btn-danger' : 'med-btn-primary'
            }`}
            onClick={() =>
              onSubmit(type, reservation, { paymentMethod })
            }
            disabled={busy}
          >
            {busy ? config.busyLabel : config.confirmLabel}
          </button>
        </>
      }
    >
      {error && (
        <p className="med-banner med-banner-error" role="alert">
          {error}
        </p>
      )}

      {config.body}
    </Modal>
  )
}

// =========================================================
// PAGE
// =========================================================

function ReservationsPage() {
  const { accessToken } = useAuth()

  const [reservations, setReservations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [dialogError, setDialogError] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  const [currentPage, setCurrentPage] = useState(1)

  // -------------------------------------------------------
  // Load
  // -------------------------------------------------------

  const loadReservations = useCallback(async () => {
    if (!accessToken) return

    try {
      const response = await apiRequest('/reservations/pharmacy', {
        token: accessToken,
      })

      setReservations(
        Array.isArray(response?.data) ? response.data : []
      )
      setLoadError('')
    } catch (requestError) {
      setLoadError(
        requestError.message || 'Failed to load reservations.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Auto-hide success messages
  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => setNotice(''), 5000)

    return () => window.clearTimeout(timer)
  }, [notice])

  // The open details modal always shows the latest data
  const selectedReservation = useMemo(
    () =>
      reservations.find(
        (reservation) => reservation.reservation_id === selectedId
      ) || null,
    [reservations, selectedId]
  )

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------

  const confirmReservation = async (reservation) => {
    const id = reservation.reservation_id

    setBusyId(id)
    setActionError('')
    setNotice('')

    try {
      await apiRequest(`/reservations/${id}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: { status: 'CONFIRMED' },
      })

      setNotice(
        `Reservation #${id} confirmed. The customer has been notified.`
      )

      await loadReservations()
    } catch (requestError) {
      setActionError(
        requestError.message || 'Failed to confirm reservation.'
      )
    } finally {
      setBusyId(null)
    }
  }

  const openDialog = (type, reservation) => {
    setDialogError('')
    setDialog({ type, reservation })
  }

  const closeDialog = () => {
    if (busyId) return

    setDialog(null)
    setDialogError('')
  }

  const submitDialog = async (type, reservation, { paymentMethod }) => {
    const id = reservation.reservation_id

    setBusyId(id)
    setDialogError('')
    setActionError('')
    setNotice('')

    try {
      if (type === 'cancel') {
        await apiRequest(`/reservations/${id}/status`, {
          method: 'PATCH',
          token: accessToken,
          body: { status: 'CANCELLED' },
        })

        setNotice(
          `Reservation #${id} cancelled. Stock returned to inventory.`
        )
      }

      if (type === 'noshow') {
        const response = await apiRequest(
          `/reservations/${id}/no-show`,
          { method: 'POST', token: accessToken }
        )

        setNotice(
          response?.message ||
            `Reservation #${id} marked as no-show. Stock returned to inventory.`
        )
      }

      if (type === 'complete') {
        const response = await apiRequest(
          `/reservations/${id}/complete`,
          {
            method: 'POST',
            token: accessToken,
            body: { payment_method: paymentMethod },
          }
        )

        const sale = response?.data

        setNotice(
          sale?.sale_id
            ? `Pickup completed. Sale #${sale.sale_id} recorded · ${formatPeso(
                sale.total_amount
              )}.`
            : 'Pickup completed and sale recorded.'
        )
      }

      setDialog(null)
      await loadReservations()
    } catch (requestError) {
      setDialogError(
        requestError.message || 'Something went wrong. Try again.'
      )
    } finally {
      setBusyId(null)
    }
  }

  const openDetails = (reservation) => {
    setActionError('')
    setSelectedId(reservation.reservation_id)
  }

  const closeDetails = () => {
    if (busyId) return

    setSelectedId(null)
  }

  // -------------------------------------------------------
  // Filtering
  // -------------------------------------------------------

  const statusCounts = useMemo(() => {
    const counts = { ALL: reservations.length }

    reservations.forEach((reservation) => {
      counts[reservation.status] = (counts[reservation.status] || 0) + 1
    })

    return counts
  }, [reservations])

  const hasFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL'

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setDateFilter('ALL')
  }

  const filteredReservations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const today = localDayKey()

    return reservations
      .filter((reservation) => {
        if (term) {
          const customer = getCustomer(reservation)

          const haystack = [
            String(reservation.reservation_id),
            `#${reservation.reservation_id}`,
            getCustomerName(reservation),
            customer?.email,
            customer?.phone,
            ...getItems(reservation).map(getMedicineName),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (!haystack.includes(term)) return false
        }

        if (
          statusFilter !== 'ALL' &&
          reservation.status !== statusFilter
        ) {
          return false
        }

        if (dateFilter !== 'ALL') {
          const day = dateOnly(reservation.pickup_date)

          if (dateFilter === 'TODAY' && day !== today) return false
          if (dateFilter === 'UPCOMING' && !(day >= today)) return false
          if (dateFilter === 'PAST' && !(day < today)) return false
        }

        return true
      })
      .sort(
        (a, b) =>
          dateOnly(b.pickup_date).localeCompare(dateOnly(a.pickup_date)) ||
          timeOnly(a.pickup_time).localeCompare(timeOnly(b.pickup_time))
      )
  }, [reservations, searchTerm, statusFilter, dateFilter])

  // -------------------------------------------------------
  // Pagination
  // -------------------------------------------------------

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  const totalPages = Math.max(
    Math.ceil(filteredReservations.length / ITEMS_PER_PAGE),
    1
  )

  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE

  const paginatedReservations = filteredReservations.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter(
    (number) =>
      number === 1 ||
      number === totalPages ||
      Math.abs(number - page) <= 1
  )

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <>
      <div className="page-header-sticky">
        <div>
          <h2 className="page-title">Reservations</h2>
          <p className="page-copy">
            Confirm, hand over and track customer pickups.
          </p>
        </div>
      </div>

      <div className="page-content-wrapper">
        <section className="med-page">
          {loadError && (
            <p className="med-banner med-banner-error" role="alert">
              {loadError}
            </p>
          )}

          {actionError && !selectedReservation && (
            <p className="med-banner med-banner-error" role="alert">
              {actionError}
              <button
                type="button"
                className="med-banner-close"
                onClick={() => setActionError('')}
                aria-label="Dismiss"
              >
                <CloseIcon />
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
                <CloseIcon />
              </button>
            </p>
          )}

          <div className="med-card">
            {/* Status tabs */}
            <div
              className="rsv-tabs"
              role="tablist"
              aria-label="Filter by status"
            >
              {STATUS_TABS.map((tab) => {
                const count = statusCounts[tab.value] || 0
                const isActive = statusFilter === tab.value

                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`rsv-tab${isActive ? ' is-active' : ''}${
                      tab.value === 'PENDING' && count > 0
                        ? ' has-attention'
                        : ''
                    }`}
                    onClick={() => setStatusFilter(tab.value)}
                  >
                    {tab.label}
                    <span className="rsv-tab-count">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Toolbar */}
            <div className="med-toolbar rsv-toolbar">
              <div className="med-search">
                <SearchIcon />

                <input
                  type="search"
                  placeholder="Search ID, customer, email, phone or medicine…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search reservations"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="med-search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>

              <Select
                size="sm"
                aria-label="Filter by pickup date"
                value={dateFilter}
                onChange={setDateFilter}
                options={DATE_OPTIONS}
              />
            </div>

            {/* Summary */}
            {!isLoading && reservations.length > 0 && (
              <div className="med-summary">
                <span>
                  {filteredReservations.length === 0
                    ? 'No reservations match'
                    : `Showing ${startIndex + 1}–${Math.min(
                        startIndex + ITEMS_PER_PAGE,
                        filteredReservations.length
                      )} of ${filteredReservations.length} reservation${
                        filteredReservations.length === 1 ? '' : 's'
                      }`}
                  {hasFilters && ` · filtered from ${reservations.length}`}
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

            {/* Table / states */}
            {isLoading ? (
              <div className="med-state">
                <p>Loading reservations…</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="med-state">
                <h3>
                  {hasFilters
                    ? 'No matching reservations'
                    : 'No reservations yet'}
                </h3>

                <p>
                  {hasFilters
                    ? 'Try a different search or clear the filters.'
                    : 'Customer reservations will appear here when they are submitted.'}
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    className="med-btn med-btn-secondary"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="med-table-scroll">
                  <table className="med-table">
                    <thead>
                      <tr>
                        <th scope="col">Reservation</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Pickup</th>
                        <th scope="col">Items</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="med-col-actions">
                          <span className="med-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedReservations.map((reservation) => {
                        const id = reservation.reservation_id
                        const customer = getCustomer(reservation)
                        const isBusy = busyId === id
                        const isOpen = OPEN_STATUSES.includes(
                          reservation.status
                        )
                        const isLate =
                          isOpen && hasPickupPassed(reservation)

                        return (
                          <tr
                            key={id}
                            className={isOpen ? '' : 'rsv-row-closed'}
                          >
                            <td>
                              <div className="med-name">
                                <strong>#{id}</strong>
                                <span>
                                  {formatDate(
                                    reservation.reservation_date ||
                                      reservation.created_at
                                  )}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="med-name">
                                <strong>{getCustomerName(reservation)}</strong>
                                {(customer?.email || customer?.phone) && (
                                  <span>
                                    {customer?.email || customer?.phone}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <div className="med-name">
                                <strong>
                                  {formatPickupDay(reservation.pickup_date)}
                                </strong>
                                <span>
                                  {formatTime(reservation.pickup_time)}
                                  {isLate && (
                                    <em className="rsv-late"> · Past pickup time</em>
                                  )}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="med-name rsv-items-cell">
                                <strong>{itemSummary(reservation)}</strong>
                                <span>{formatPeso(reservationTotal(reservation))}</span>
                              </div>
                            </td>

                            <td>
                              <StatusPill status={reservation.status} />
                            </td>

                            <td className="med-col-actions">
                              <div className="med-actions">
                                <button
                                  type="button"
                                  className="med-action"
                                  onClick={() => openDetails(reservation)}
                                  aria-label={`View reservation #${id}`}
                                >
                                  View
                                </button>

                                {reservation.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    className="rsv-row-primary"
                                    onClick={() =>
                                      confirmReservation(reservation)
                                    }
                                    disabled={isBusy}
                                  >
                                    {isBusy ? 'Confirming…' : 'Confirm'}
                                  </button>
                                )}

                                {reservation.status === 'CONFIRMED' && (
                                  <button
                                    type="button"
                                    className="rsv-row-primary"
                                    onClick={() =>
                                      openDialog('complete', reservation)
                                    }
                                    disabled={isBusy}
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <nav
                    className="med-pagination"
                    aria-label="Reservation pages"
                  >
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
                        <ChevronLeftIcon />
                      </button>

                      {pageNumbers.map((number, index) => (
                        <span key={number} className="med-page-group">
                          {index > 0 &&
                            number - pageNumbers[index - 1] > 1 && (
                              <span className="med-ellipsis">…</span>
                            )}

                          <button
                            type="button"
                            className={`med-page-btn${
                              number === page ? ' is-current' : ''
                            }`}
                            onClick={() => setCurrentPage(number)}
                            aria-current={
                              number === page ? 'page' : undefined
                            }
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
                        <ChevronRightIcon />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <ReservationDetails
        reservation={selectedReservation}
        busy={Boolean(
          selectedReservation &&
            busyId === selectedReservation.reservation_id
        )}
        error={actionError}
        onClose={closeDetails}
        onConfirm={confirmReservation}
        onRequestAction={openDialog}
      />

      <ActionDialog
        dialog={dialog}
        busy={Boolean(
          dialog && busyId === dialog.reservation.reservation_id
        )}
        error={dialogError}
        onClose={closeDialog}
        onSubmit={submitDialog}
      />
    </>
  )
}

export default ReservationsPage