import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import './SalesPage.css'

const ALLOWED_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'GCASH',
  'MAYA',
  'BANK_TRANSFER',
  'OTHER',
]

function SalesPage() {
  const { accessToken } = useAuth()

  const [sales, setSales] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [selectedSale, setSelectedSale] = useState(null)
  const [refundingSale, setRefundingSale] = useState(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  // --------------------------------------------------
  // Load sales
  // --------------------------------------------------

  const loadSales = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)

      const qs = params.toString()
      const path = `/sales/pharmacy${qs ? `?${qs}` : ''}`

      const response = await apiRequest(path, { token: accessToken })
      setSales(response.data || [])
    } catch (requestError) {
      setError(requestError.message || 'Failed to load sales')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // --------------------------------------------------
  // Filters (client-side search on top of server-side date filter)
  // --------------------------------------------------

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return sales

    return sales.filter((sale) => {
      const code = `SALE-${String(sale.sale_id).padStart(6, '0')}`.toLowerCase()
      const customer = getCustomerName(sale).toLowerCase()
      const pm = (sale.payment_method || '').toLowerCase()
      return (
        code.includes(term) ||
        customer.includes(term) ||
        pm.includes(term)
      )
    })
  }, [sales, searchTerm])

  // --------------------------------------------------
  // Summary
  // --------------------------------------------------

  const totalRevenue = filteredSales.reduce(
    (sum, s) => sum + Number(s.total_amount || 0),
    0,
  )
  const totalCount = filteredSales.length
  const averageSale = totalCount > 0 ? totalRevenue / totalCount : 0

  const todayRevenue = sales
    .filter((s) => isToday(s.sale_date))
    .reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function getCustomerName(sale) {
    const c = sale.users || sale.customer
    if (!c) return 'Walk-in'
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
    return name || 'Walk-in'
  }

  function isToday(dateString) {
    if (!dateString) return false
    const d = new Date(dateString)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  function getSaleCode(sale) {
    return `SALE-${String(sale.sale_id).padStart(6, '0')}`
  }

  function formatDate(value) {
    if (!value) return '—'
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function getItems(sale) {
    return sale.sale_items || sale.items || []
  }

  function getMedicineName(item) {
    const m = item.medicines
    if (!m) return `Medicine #${item.medicine_id}`
    return (
      m.brand_name ||
      m.generic_name ||
      `Medicine #${item.medicine_id}`
    )
  }

  function getMedicineDescription(item) {
    const m = item.medicines
    if (!m) return ''
    return [m.generic_name, m.dosage, m.dosage_form]
      .filter(Boolean)
      .join(' • ')
  }

  function formatPaymentMethod(pm) {
    if (!pm) return '—'
    return pm
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // --------------------------------------------------
  // Apply date filters (server call)
  // --------------------------------------------------

  const applyDateFilters = (e) => {
    e.preventDefault()
    loadSales()
  }

  const clearDateFilters = () => {
    setFromDate('')
    setToDate('')
    setTimeout(loadSales, 0)
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="sales-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pharmacy Operations</span>
          <h2 className="page-title">Sales</h2>
          <p className="page-copy">
            Record in-person sales and view your pharmacy's sales history.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setSuccessMessage('')
            setError('')
            setIsRecordModalOpen(true)
          }}
        >
          + Record Sale
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="form-success" role="status">
          {successMessage}
        </p>
      )}

      {/* Summary */}
      <div className="sales-summary">
        <article className="sales-summary-card">
          <span>Today's Revenue</span>
          <strong>₱{formatCurrency(todayRevenue)}</strong>
        </article>
        <article className="sales-summary-card">
          <span>Filtered Sales</span>
          <strong>{totalCount}</strong>
        </article>
        <article className="sales-summary-card">
          <span>Filtered Revenue</span>
          <strong>₱{formatCurrency(totalRevenue)}</strong>
        </article>
        <article className="sales-summary-card">
          <span>Average Sale</span>
          <strong>₱{formatCurrency(averageSale)}</strong>
        </article>
      </div>

      {/* Filters */}
      <form className="sales-filters" onSubmit={applyDateFilters}>
        <div className="sales-filter-group">
          <label>
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="sales-search">
            Search
            <input
              type="text"
              placeholder="Sale ID, customer, payment…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="sales-filter-actions">
          <button type="submit">Apply</button>
          <button type="button" onClick={clearDateFilters}>
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="sales-table-wrap">
        {isLoading ? (
          <div className="sales-state">
            <p>Loading sales…</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="sales-state">
            <h3>No sales recorded yet</h3>
            <p>
              Click "Record Sale" to log your first in-person transaction.
            </p>
          </div>
        ) : (
          <div className="sales-table-scroll">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const items = getItems(sale)
                  return (
                    <tr key={sale.sale_id}>
                      <td className="sales-id">
                        {getSaleCode(sale)}
                        {sale.reservation_id && (
                          <span className="sales-from-reservation">
                            From Reservation #{sale.reservation_id}
                          </span>
                        )}
                      </td>
                      <td>{formatDate(sale.sale_date)}</td>
                      <td>{getCustomerName(sale)}</td>
                      <td>
                        {items.length}{' '}
                        {items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td>{formatPaymentMethod(sale.payment_method)}</td>
                      <td className="sales-total">
                        ₱{formatCurrency(sale.total_amount)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-review"
                          onClick={() => setSelectedSale(sale)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onOpenRefund={(sale) => {
            setRefundingSale(sale)
            setSelectedSale(null)
          }}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          formatPaymentMethod={formatPaymentMethod}
          getCustomerName={getCustomerName}
          getItems={getItems}
          getMedicineName={getMedicineName}
          getMedicineDescription={getMedicineDescription}
          getSaleCode={getSaleCode}
        />
      )}

      {/* Refund Sale Modal */}
      {refundingSale && (
        <RefundSaleModal
          sale={refundingSale}
          accessToken={accessToken}
          onClose={() => setRefundingSale(null)}
          onSuccess={(message) => {
            setRefundingSale(null)
            setSuccessMessage(message)
            loadSales()
          }}
          onError={(message) => setError(message)}
        />
      )}

      {/* Record Sale Modal */}
      {isRecordModalOpen && (
        <RecordSaleModal
          accessToken={accessToken}
          onClose={() => setIsRecordModalOpen(false)}
          onSuccess={(message) => {
            setIsRecordModalOpen(false)
            setSuccessMessage(message)
            loadSales()
          }}
          onError={(message) => setError(message)}
        />
      )}
    </section>
  )
}

/* ============================================================
   SALE DETAILS MODAL
============================================================ */

function SaleDetailsModal({
  sale,
  onClose,
  onOpenRefund,
  formatDate,
  formatCurrency,
  formatPaymentMethod,
  getCustomerName,
  getItems,
  getMedicineName,
  getMedicineDescription,
  getSaleCode,
}) {
  const items = getItems(sale)
  const customer = sale.users || sale.customer

  return (
    <div
      className="sales-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sales-modal" role="dialog" aria-modal="true">
        <div className="sales-modal-header">
          <div>
            <span className="eyebrow">Sale Details</span>
            <h3>{getSaleCode(sale)}</h3>
          </div>
          <button
            type="button"
            className="sales-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="sales-modal-body">
          <div className="sales-detail-grid">
            <div>
              <span className="sales-detail-label">Date</span>
              <strong>{formatDate(sale.sale_date)}</strong>
            </div>
            <div>
              <span className="sales-detail-label">Payment</span>
              <strong>{formatPaymentMethod(sale.payment_method)}</strong>
            </div>
            <div>
              <span className="sales-detail-label">Customer</span>
              <strong>{getCustomerName(sale)}</strong>
            </div>
            <div>
              <span className="sales-detail-label">Reservation</span>
              <strong>
                {sale.reservation_id
                  ? `#${sale.reservation_id}`
                  : '—'}
              </strong>
            </div>
            {customer?.email && (
              <div>
                <span className="sales-detail-label">Email</span>
                <strong>{customer.email}</strong>
              </div>
            )}
            {customer?.phone && (
              <div>
                <span className="sales-detail-label">Phone</span>
                <strong>{customer.phone}</strong>
              </div>
            )}
          </div>

          <div className="sales-detail-section">
            <h4>Items ({items.length})</h4>

            {items.length === 0 ? (
              <p className="sales-empty">No items.</p>
            ) : (
              <div className="sales-items-list">
                {items.map((item) => (
                  <div className="sales-item" key={item.sale_item_id}>
                    <div className="sales-item-info">
                      <strong>{getMedicineName(item)}</strong>
                      <span>{getMedicineDescription(item)}</span>
                    </div>
                    <div className="sales-item-col">
                      <span>Qty</span>
                      <strong>{item.quantity}</strong>
                    </div>
                    <div className="sales-item-col">
                      <span>Unit</span>
                      <strong>₱{formatCurrency(item.unit_price)}</strong>
                    </div>
                    <div className="sales-item-col">
                      <span>Subtotal</span>
                      <strong>₱{formatCurrency(item.subtotal)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sales-detail-total">
            <span>Total</span>
            <strong>₱{formatCurrency(sale.total_amount)}</strong>
          </div>
        </div>

        <div className="sales-modal-footer">
          <button type="button" onClick={onClose}>
            Close
          </button>
          {sale.status === 'COMPLETED' && onOpenRefund && (
            <button
              type="button"
              onClick={() => onOpenRefund(sale)}
            >
              Refund…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   RECORD SALE MODAL
============================================================ */

function RecordSaleModal({ accessToken, onClose, onSuccess, onError }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [customerId, setCustomerId] = useState('')
  const [reservationId, setReservationId] = useState('')
  const [items, setItems] = useState([
    { medicine_id: '', quantity: 1, unit_price: 0 },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  const addItem = () => {
    setItems((current) => [
      ...current,
      { medicine_id: '', quantity: 1, unit_price: 0 },
    ])
  }

  const removeItem = (index) => {
    setItems((current) =>
      current.length <= 1
        ? current
        : current.filter((_, i) => i !== index),
    )
  }

  const total = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanItems = items
      .filter((i) => i.medicine_id && Number(i.quantity) > 0)
      .map((i) => ({
        medicine_id: Number(i.medicine_id),
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      }))

    if (cleanItems.length === 0) {
      onError('Please add at least one item with a valid medicine ID.')
      return
    }

    try {
      setIsSubmitting(true)
      onError('')

      const body = {
        payment_method: paymentMethod,
        items: cleanItems,
      }

      if (customerId.trim()) body.customer_id = Number(customerId.trim())
      if (reservationId.trim())
        body.reservation_id = Number(reservationId.trim())

      const response = await apiRequest('/sales', {
        method: 'POST',
        token: accessToken,
        body,
      })

      onSuccess(response.message || 'Sale recorded successfully')
    } catch (requestError) {
      onError(requestError.message || 'Failed to record sale')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="sales-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sales-modal" role="dialog" aria-modal="true">
        <div className="sales-modal-header">
          <div>
            <span className="eyebrow">New Transaction</span>
            <h3>Record Sale</h3>
          </div>
          <button
            type="button"
            className="sales-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="sales-modal-body" onSubmit={handleSubmit}>
          <div className="sales-detail-grid">
            <label>
              <span className="sales-detail-label">Payment Method</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {ALLOWED_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sales-detail-label">
                Customer ID (optional)
              </span>
              <input
                type="number"
                placeholder="Leave blank for walk-in"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </label>

            <label>
              <span className="sales-detail-label">
                Reservation ID (optional)
              </span>
              <input
                type="number"
                placeholder="If linked to a reservation"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
              />
            </label>
          </div>

          <div className="sales-detail-section">
            <div className="sales-items-heading">
              <h4>Items</h4>
              <button type="button" onClick={addItem}>
                + Add Item
              </button>
            </div>

            <div className="sales-items-list">
              {items.map((item, index) => (
                <div className="sales-item sales-item-edit" key={index}>
                  <label>
                    <span>Medicine ID</span>
                    <input
                      type="number"
                      required
                      value={item.medicine_id}
                      onChange={(e) =>
                        updateItem(index, 'medicine_id', e.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Qty</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', e.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Unit Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, 'unit_price', e.target.value)
                      }
                    />
                  </label>
                  <div className="sales-item-col">
                    <span>Subtotal</span>
                    <strong>
                      ₱
                      {(
                        (Number(item.quantity) || 0) *
                        (Number(item.unit_price) || 0)
                      ).toFixed(2)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sales-item-remove"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="sales-detail-total">
            <span>Total</span>
            <strong>₱{total.toFixed(2)}</strong>
          </div>

          <div className="sales-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording…' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ============================================================
   REFUND SALE MODAL
============================================================ */

function RefundSaleModal({
  sale,
  accessToken,
  onClose,
  onSuccess,
  onError,
}) {
  const [selections, setSelections] = useState({})
  const [refundMethod, setRefundMethod] = useState('CASH')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const items = sale.sale_items || sale.items || []

  const toggleItem = (item) => {
    setSelections((current) => {
      const next = { ...current }

      if (next[item.sale_item_id] !== undefined) {
        delete next[item.sale_item_id]
      } else {
        next[item.sale_item_id] = item.quantity
      }

      return next
    })
  }

  const updateQuantity = (item, value) => {
    const max = item.quantity
    let quantity = Number(value)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      quantity = 1
    }

    if (quantity > max) {
      quantity = max
    }

    setSelections((current) => ({
      ...current,
      [item.sale_item_id]: quantity,
    }))
  }

  const refundTotal = items.reduce((sum, item) => {
    const quantity = selections[item.sale_item_id]

    if (!quantity) return sum

    return sum + quantity * Number(item.unit_price || 0)
  }, 0)

  const selectedCount = Object.keys(selections).length

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (selectedCount === 0) {
      onError('Select at least one item to refund.')
      return
    }

    try {
      setIsSubmitting(true)
      onError('')

      const payload = {
        refund_method: refundMethod,
        reason: reason.trim() || null,
        items: Object.entries(selections).map(
          ([saleItemId, quantity]) => ({
            sale_item_id: Number(saleItemId),
            quantity: Number(quantity),
          }),
        ),
      }

      const response = await apiRequest(
        `/refunds/sales/${sale.sale_id}/refund`,
        {
          method: 'POST',
          token: accessToken,
          body: payload,
        },
      )

      onSuccess(
        `Refund #${response.data.refund_id} recorded — ₱${Number(
          response.data.amount,
        ).toFixed(2)}`,
      )
    } catch (requestError) {
      onError(requestError.message || 'Failed to process refund')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="sales-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sales-modal" role="dialog" aria-modal="true">
        <div className="sales-modal-header">
          <div>
            <span className="eyebrow">Process Refund</span>
            <h3>Refund Sale #{sale.sale_id}</h3>
          </div>
          <button
            type="button"
            className="sales-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="sales-modal-body" onSubmit={handleSubmit}>
          <div className="sales-detail-grid">
            <label>
              <span className="sales-detail-label">Refund Method</span>
              <select
                value={refundMethod}
                onChange={(event) => setRefundMethod(event.target.value)}
              >
                {ALLOWED_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sales-detail-section">
            <h4>Select items to refund</h4>

            <div className="refund-items-list">
              {items.map((item) => {
                const isSelected =
                  selections[item.sale_item_id] !== undefined
                const quantity =
                  selections[item.sale_item_id] ?? item.quantity

                return (
                  <div
                    className={`refund-item ${
                      isSelected ? 'selected' : ''
                    }`}
                    key={item.sale_item_id}
                  >
                    <label className="refund-item-check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item)}
                      />
                    </label>

                    <div className="refund-item-info">
                      <strong>
                        {item.medicines?.brand_name ||
                          item.medicines?.generic_name ||
                          `Medicine #${item.medicine_id}`}
                      </strong>
                      <span>
                        Sold: {item.quantity} × ₱
                        {Number(item.unit_price).toFixed(2)}
                      </span>
                    </div>

                    <div className="refund-item-qty">
                      <span>Refund Qty</span>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={quantity}
                        disabled={!isSelected}
                        onChange={(event) =>
                          updateQuantity(item, event.target.value)
                        }
                      />
                    </div>

                    <div className="refund-item-subtotal">
                      <span>Refund</span>
                      <strong>
                        ₱
                        {isSelected
                          ? (
                              quantity * Number(item.unit_price)
                            ).toFixed(2)
                          : '0.00'}
                      </strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="sales-detail-section">
            <label>
              <span className="sales-detail-label">
                Reason (optional)
              </span>
              <textarea
                rows="3"
                placeholder="e.g., Customer returned wrong medicine"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="refund-reason"
              />
            </label>
          </div>

          <div className="sales-detail-total">
            <span>Total Refund</span>
            <strong>₱{refundTotal.toFixed(2)}</strong>
          </div>

          <div className="sales-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedCount === 0}
            >
              {isSubmitting
                ? 'Processing…'
                : `Refund ₱${refundTotal.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SalesPage