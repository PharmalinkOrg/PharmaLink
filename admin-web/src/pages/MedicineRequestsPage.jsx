import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

const statusFlow = {
  PENDING: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE'],
  AVAILABLE: ['FULFILLED'],
  PARTIALLY_AVAILABLE: ['FULFILLED'],
  UNAVAILABLE: ['CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
}

const statusLabel = (status) =>
  status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

function MedicineRequestsPage() {
  const { accessToken } = useAuth()
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    let isCurrent = true

    apiRequest('/medicine-requests/pharmacy', { token: accessToken })
      .then((response) => {
        if (isCurrent) setRequests(response.data || [])
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  const updateStatus = async (requestId, status) => {
    setUpdatingId(requestId)
    setError('')
    setSuccessMessage('')

    try {
      const response = await apiRequest(`/medicine-requests/${requestId}/status`, {
        token: accessToken,
        method: 'PATCH',
        body: { status },
      })

      setRequests((current) =>
        current.map((r) => (r.medicine_request_id === requestId ? { ...r, ...response.data } : r)),
      )
      setSelectedRequest((current) =>
        current && current.medicine_request_id === requestId ? { ...current, ...response.data } : current,
      )
      setSuccessMessage(response.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const getCustomerName = (request) => {
    const customer = request.users
    if (!customer) return `Customer #${request.customer_id}`
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || `Customer #${request.customer_id}`
  }

  const getItems = (request) => request.medicine_request_items || []

  const getMedicineName = (item) => {
    const medicine = item.medicines
    if (!medicine) return `Medicine #${item.medicine_id}`
    return medicine.brand_name || medicine.generic_name
  }

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  const openDetails = (request) => {
    setSelectedRequest(request)
    setError('')
    setSuccessMessage('')
  }

  const closeDetails = () => setSelectedRequest(null)

  return (
    <section className="medicine-requests-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pharmacy Operations</span>
          <h2 className="page-title">Medicine Requests</h2>
          <p className="page-copy">Review and respond to customer medicine requests.</p>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {successMessage && <p className="form-notice">{successMessage}</p>}

      <div className="inventory-table-wrap">
        {isLoading ? (
          <p>Loading medicine requests…</p>
        ) : requests.length === 0 ? (
          <p>No medicine requests yet.</p>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr><th>Request</th><th>Customer</th><th>Items</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.medicine_request_id}>
                  <td>#{request.medicine_request_id}</td>
                  <td>{getCustomerName(request)}</td>
                  <td>{getItems(request).length} {getItems(request).length === 1 ? 'item' : 'items'}</td>
                  <td>{formatDate(request.created_at)}</td>
                  <td><span className={`status-pill ${request.status.toLowerCase()}`}>{statusLabel(request.status)}</span></td>
                  <td className="table-actions">
                    <button type="button" onClick={() => openDetails(request)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <div
          className="reservation-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails()
          }}
        >
          <div className="reservation-modal" role="dialog" aria-modal="true">
            <div className="reservation-modal-header">
              <div>
                <span className="eyebrow">Request Details</span>
                <h3>Request #{selectedRequest.medicine_request_id}</h3>
              </div>
              <button type="button" className="reservation-modal-close" onClick={closeDetails} aria-label="Close">×</button>
            </div>

            <div className="reservation-modal-body">
              <div className="reservation-detail-status">
                <span>Status</span>
                <span className={`status-pill ${selectedRequest.status.toLowerCase()}`}>
                  {statusLabel(selectedRequest.status)}
                </span>
              </div>

              <div className="reservation-detail-section">
                <h4>Customer</h4>
                <div className="reservation-detail-grid">
                  <div><span className="reservation-detail-label">Name</span><strong>{getCustomerName(selectedRequest)}</strong></div>
                  <div><span className="reservation-detail-label">Email</span><strong>{selectedRequest.users?.email || '—'}</strong></div>
                  <div><span className="reservation-detail-label">Phone</span><strong>{selectedRequest.users?.phone || '—'}</strong></div>
                  <div><span className="reservation-detail-label">Requested</span><strong>{formatDate(selectedRequest.created_at)}</strong></div>
                </div>
              </div>

              <div className="reservation-detail-section">
                <h4>Notes</h4>
                <p className="reservation-notes">{selectedRequest.notes || 'No notes provided.'}</p>
              </div>

              <div className="reservation-detail-section">
                <h4>Requested Medicines</h4>
                {getItems(selectedRequest).length === 0 ? (
                  <p className="reservation-notes">No items found.</p>
                ) : (
                  <div className="reservation-items-list">
                    {getItems(selectedRequest).map((item) => (
                      <div className="reservation-item" key={item.medicine_request_item_id}>
                        <div className="reservation-item-info">
                          <strong>{getMedicineName(item)}</strong>
                          {item.medicines?.requires_prescription && <small>Prescription Required</small>}
                        </div>
                        <div className="reservation-item-quantity">
                          <span>Requested</span>
                          <strong>{item.requested_quantity}</strong>
                        </div>
                        <div className="reservation-item-quantity">
                          <span>Available</span>
                          <strong>{item.available_quantity}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="reservation-modal-footer">
              <button type="button" onClick={closeDetails}>Close</button>
              {(statusFlow[selectedRequest.status] || []).map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  onClick={() => updateStatus(selectedRequest.medicine_request_id, nextStatus)}
                  disabled={updatingId === selectedRequest.medicine_request_id}
                >
                  {updatingId === selectedRequest.medicine_request_id ? 'Updating…' : `Mark as ${statusLabel(nextStatus)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default MedicineRequestsPage