import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import './ReportsPage.css'

const REPORT_TYPES = {
  COMPLAINT: 'Complaint',
  SIDE_EFFECT: 'Side Effect',
  SUGGESTION: 'Suggestion',
  DEFECTIVE: 'Defective Product',
  OTHER: 'Other',
}

const REPORT_STATUSES = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
}

function ReportsPage() {
  const { accessToken } = useAuth()

  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [selectedReport, setSelectedReport] = useState(null)

  // --------------------------------------------------
  // Load reports
  // --------------------------------------------------

  const loadReports = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (typeFilter) params.append('type', typeFilter)
      if (statusFilter) params.append('status', statusFilter)

      const qs = params.toString()
      const path = `/reports/pharmacy${qs ? `?${qs}` : ''}`

      const response = await apiRequest(path, { token: accessToken })
      setReports(response.data || [])
    } catch (requestError) {
      setError(requestError.message || 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // --------------------------------------------------
  // Filters (client-side search)
  // --------------------------------------------------

  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return reports

    return reports.filter((report) => {
      const id = `REP-${String(report.report_id).padStart(6, '0')}`.toLowerCase()
      const customer = getCustomerName(report).toLowerCase()
      const medicine = getMedicineName(report).toLowerCase()
      const desc = (report.description || '').toLowerCase()
      return (
        id.includes(term) ||
        customer.includes(term) ||
        medicine.includes(term) ||
        desc.includes(term)
      )
    })
  }, [reports, searchTerm])

  // --------------------------------------------------
  // Summary
  // --------------------------------------------------

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length
  const reviewedCount = reports.filter((r) => r.status === 'REVIEWED').length
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length
  const totalCount = filteredReports.length

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function getCustomerName(report) {
    const c = report.users || report.customer
    if (!c) return 'Unknown Customer'
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
    return name || c.email || 'Unknown Customer'
  }

  function getMedicineName(report) {
    const m = report.medicines
    if (!m) return 'Unknown Medicine'
    return m.brand_name || m.generic_name || `Medicine #${report.medicine_id}`
  }

  function getReportCode(report) {
    return `REP-${String(report.report_id).padStart(6, '0')}`
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

  function getStatusClass(status) {
    switch (status) {
      case 'PENDING':
        return 'status-pending'
      case 'REVIEWED':
        return 'status-reviewed'
      case 'RESOLVED':
        return 'status-resolved'
      case 'DISMISSED':
        return 'status-dismissed'
      default:
        return ''
    }
  }

  function getTypeClass(type) {
    switch (type) {
      case 'COMPLAINT':
        return 'type-complaint'
      case 'SIDE_EFFECT':
        return 'type-side-effect'
      case 'SUGGESTION':
        return 'type-suggestion'
      case 'DEFECTIVE':
        return 'type-defective'
      default:
        return 'type-other'
    }
  }

  // --------------------------------------------------
  // Apply filters (server call)
  // --------------------------------------------------

  const applyFilters = (e) => {
    e.preventDefault()
    loadReports()
  }

  const clearFilters = () => {
    setTypeFilter('')
    setStatusFilter('')
    setSearchTerm('')
    setTimeout(loadReports, 0)
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="reports-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Customer Feedback</span>
          <h2 className="page-title">Reports</h2>
          <p className="page-copy">
            View and manage reports, complaints, side effects, and suggestions from customers
            who have purchased medicines from your pharmacy.
          </p>
        </div>
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
      <div className="reports-summary">
        <article className="reports-summary-card">
          <span>Pending</span>
          <strong className="count-pending">{pendingCount}</strong>
        </article>
        <article className="reports-summary-card">
          <span>Reviewed</span>
          <strong className="count-reviewed">{reviewedCount}</strong>
        </article>
        <article className="reports-summary-card">
          <span>Resolved</span>
          <strong className="count-resolved">{resolvedCount}</strong>
        </article>
        <article className="reports-summary-card">
          <span>Total Reports</span>
          <strong>{totalCount}</strong>
        </article>
      </div>

      {/* Filters */}
      <form className="reports-filters" onSubmit={applyFilters}>
        <div className="reports-filter-group">
          <label>
            Report Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(REPORT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(REPORT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-search">
            Search
            <input
              type="text"
              placeholder="Report ID, customer, medicine…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="reports-filter-actions">
          <button type="submit">Apply</button>
          <button type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="reports-table-wrap">
        {isLoading ? (
          <div className="reports-state">
            <p>Loading reports…</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="reports-state">
            <h3>No reports yet</h3>
            <p>
              Customer reports, complaints, and suggestions will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="reports-table-scroll">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Medicine</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.report_id}>
                    <td className="reports-id">{getReportCode(report)}</td>
                    <td>{formatDate(report.created_at)}</td>
                    <td>{getCustomerName(report)}</td>
                    <td>{getMedicineName(report)}</td>
                    <td>
                      <span className={`reports-type-badge ${getTypeClass(report.type)}`}>
                        {REPORT_TYPES[report.type] || report.type}
                      </span>
                    </td>
                    <td>
                      <span className={`reports-status-badge ${getStatusClass(report.status)}`}>
                        {REPORT_STATUSES[report.status] || report.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-review"
                        onClick={() => setSelectedReport(report)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          accessToken={accessToken}
          onClose={() => {
            setSelectedReport(null)
            setSuccessMessage('')
            setError('')
          }}
          onSuccess={(message) => {
            setSelectedReport(null)
            setSuccessMessage(message)
            loadReports()
          }}
          onError={(message) => {
            setError(message)
          }}
          formatDate={formatDate}
          getCustomerName={getCustomerName}
          getMedicineName={getMedicineName}
          getReportCode={getReportCode}
        />
      )}
    </section>
  )
}

/* ============================================================
   REPORT DETAILS MODAL
============================================================ */

function ReportDetailsModal({
  report,
  accessToken,
  onClose,
  onSuccess,
  onError,
  formatDate,
  getCustomerName,
  getMedicineName,
  getReportCode,
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState(report.status)
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || '')

  const customer = report.users || report.customer
  const medicine = report.medicines

  const handleUpdateStatus = async () => {
    try {
      setIsUpdating(true)
      onError('')

      const response = await apiRequest(`/reports/${report.report_id}/status`, {
        method: 'PUT',
        token: accessToken,
        body: {
          status: newStatus,
          admin_notes: adminNotes.trim() || null,
        },
      })

      onSuccess(response.message || 'Report updated successfully')
    } catch (requestError) {
      onError(requestError.message || 'Failed to update report')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div
      className="reports-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="reports-modal" role="dialog" aria-modal="true">
        <div className="reports-modal-header">
          <div>
            <span className="eyebrow">Report Details</span>
            <h3>{getReportCode(report)}</h3>
          </div>
          <button
            type="button"
            className="reports-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="reports-modal-body">
          <div className="reports-detail-grid">
            <div>
              <span className="reports-detail-label">Date Submitted</span>
              <strong>{formatDate(report.created_at)}</strong>
            </div>
            <div>
              <span className="reports-detail-label">Type</span>
              <strong>{REPORT_TYPES[report.type] || report.type}</strong>
            </div>
            <div>
              <span className="reports-detail-label">Status</span>
              <strong>{REPORT_STATUSES[report.status] || report.status}</strong>
            </div>
          </div>

          <div className="reports-detail-section">
            <h4>Customer Information</h4>
            <div className="reports-detail-grid">
              <div>
                <span className="reports-detail-label">Name</span>
                <strong>{getCustomerName(report)}</strong>
              </div>
              {customer?.email && (
                <div>
                  <span className="reports-detail-label">Email</span>
                  <strong>{customer.email}</strong>
                </div>
              )}
              {customer?.phone && (
                <div>
                  <span className="reports-detail-label">Phone</span>
                  <strong>{customer.phone}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="reports-detail-section">
            <h4>Medicine Information</h4>
            <div className="reports-detail-grid">
              <div>
                <span className="reports-detail-label">Medicine Name</span>
                <strong>{getMedicineName(report)}</strong>
              </div>
              {medicine?.generic_name && (
                <div>
                  <span className="reports-detail-label">Generic Name</span>
                  <strong>{medicine.generic_name}</strong>
                </div>
              )}
              {medicine?.dosage && (
                <div>
                  <span className="reports-detail-label">Dosage</span>
                  <strong>{medicine.dosage}</strong>
                </div>
              )}
              {report.sale_id && (
                <div>
                  <span className="reports-detail-label">Sale ID</span>
                  <strong>SALE-{String(report.sale_id).padStart(6, '0')}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="reports-detail-section">
            <h4>Report Description</h4>
            <div className="reports-description">
              {report.description || 'No description provided.'}
            </div>
          </div>

          {report.image_url && (
            <div className="reports-detail-section">
              <h4>Attached Image</h4>
              <img
                src={report.image_url}
                alt="Report attachment"
                className="reports-image"
              />
            </div>
          )}

          <div className="reports-detail-section">
            <h4>Update Status</h4>
            <div className="reports-update-form">
              <label>
                <span className="reports-detail-label">New Status</span>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {Object.entries(REPORT_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="reports-detail-label">Admin Notes</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this report..."
                  rows="4"
                />
              </label>
            </div>
          </div>

          {report.admin_notes && report.status !== 'PENDING' && (
            <div className="reports-detail-section">
              <h4>Previous Admin Notes</h4>
              <div className="reports-description">
                {report.admin_notes}
              </div>
              {report.updated_at && (
                <small className="reports-updated">
                  Last updated: {formatDate(report.updated_at)}
                </small>
              )}
            </div>
          )}
        </div>

        <div className="reports-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleUpdateStatus}
            disabled={isUpdating || newStatus === report.status}
          >
            {isUpdating ? 'Updating…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
