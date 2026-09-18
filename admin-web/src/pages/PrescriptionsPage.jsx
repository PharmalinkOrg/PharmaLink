import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import './PrescriptionsPage.css'

function PrescriptionsPage() {
  const { accessToken } = useAuth()

  const [prescriptions, setPrescriptions] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  // --------------------------------------------------
  // Load prescriptions
  // --------------------------------------------------

  useEffect(() => {
    let isCurrent = true

    if (!accessToken) {
      setPrescriptions([])
      setIsLoading(false)
      return undefined
    }

    setIsLoading(true)
    setError('')

    apiRequest('/prescriptions/pharmacy', { token: accessToken })
      .then((response) => {
        if (isCurrent) {
          setPrescriptions(response.data || [])
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message || 'Failed to load prescriptions')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  // --------------------------------------------------
  // Update status
  // --------------------------------------------------

  const updateStatus = async (prescriptionId, status) => {
    try {
      setUpdatingId(prescriptionId)
      setError('')
      setSuccessMessage('')

      const response = await apiRequest(
        `/prescriptions/${prescriptionId}/status`,
        {
          method: 'PATCH',
          token: accessToken,
          body: { status },
        },
      )

      const updated = response.data

      setPrescriptions((current) =>
        current.map((p) =>
          p.prescription_id === prescriptionId ? { ...p, ...updated } : p,
        ),
      )

      setSelectedPrescription((current) =>
        current && current.prescription_id === prescriptionId
          ? { ...current, ...updated }
          : current,
      )

      setSuccessMessage(
        response.message || `Prescription ${status.toLowerCase()} successfully`,
      )
    } catch (requestError) {
      setError(requestError.message || 'Failed to update prescription status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleVerify = (id) => updateStatus(id, 'VERIFIED')

  const handleReject = (id) => {
    if (!window.confirm('Reject this prescription?')) return
    updateStatus(id, 'REJECTED')
  }

  // --------------------------------------------------
  // Modal
  // --------------------------------------------------

  const openDetails = async (prescription) => {
    setSelectedPrescription(prescription)
    setSignedUrl('')
    setError('')
    setSuccessMessage('')

    if (!prescription.image_url) return

    try {
      setIsLoadingUrl(true)
      const response = await apiRequest(
        `/prescriptions/${prescription.prescription_id}/url`,
        { token: accessToken },
      )
      setSignedUrl(response.data?.signed_url || '')
    } catch (requestError) {
      setError(requestError.message || 'Failed to load prescription image')
    } finally {
      setIsLoadingUrl(false)
    }
  }

  const closeDetails = () => {
    setSelectedPrescription(null)
    setSignedUrl('')
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const getStatusClass = (status) =>
    `status-badge badge-${(status || 'unknown').toLowerCase()}`

  const formatStatus = (status) => {
    if (!status) return 'Unknown'
    return status
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatDate = (value) => {
    if (!value) return '—'
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getCustomerName = (p) => {
    const c = p.users || p.customer
    if (!c) return `Customer #${p.customer_id}`
    return (
      `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
      `Customer #${p.customer_id}`
    )
  }

  const getFileType = (imageUrl) => {
    if (!imageUrl) return 'FILE'
    const ext = imageUrl.split('.').pop().toUpperCase()
    return ext.length <= 4 ? ext : 'FILE'
  }

  const getPrescriptionCode = (p) =>
    `RX-${String(p.prescription_id).padStart(6, '0')}`

  // --------------------------------------------------
  // Filtering
  // --------------------------------------------------

  const filteredPrescriptions =
    activeTab === 'All'
      ? prescriptions
      : prescriptions.filter(
          (p) => formatStatus(p.status) === activeTab,
        )

  const tabs = ['All', 'Pending', 'Verified', 'Rejected']

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="prescriptions-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Prescription Verification Queue</h2>
          <p className="page-copy">
            Review and verify customer prescription uploads.
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

      {/* Tabs */}
      <div className="prescription-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`prescription-tab ${
              activeTab === tab ? 'active' : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="prescription-table-wrap">
        {isLoading ? (
          <div className="prescription-state">
            <p>Loading prescriptions…</p>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="prescription-state">
            <h3>No prescriptions found</h3>
            <p>
              {activeTab === 'All'
                ? 'Customer prescription uploads will appear here.'
                : `No ${activeTab.toLowerCase()} prescriptions.`}
            </p>
          </div>
        ) : (
          <div className="prescription-table-scroll">
            <table className="prescription-table">
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Customer</th>
                  <th>Prescription Date</th>
                  <th>Uploaded</th>
                  <th>File Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((p) => (
                  <tr key={p.prescription_id}>
                    <td className="prescription-id">
                      {getPrescriptionCode(p)}
                    </td>
                    <td>{getCustomerName(p)}</td>
                    <td>{formatDate(p.prescription_date)}</td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      <span className="prescription-filetype">
                        {getFileType(p.image_url)}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(p.status)}>
                        {formatStatus(p.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-review"
                        onClick={() => openDetails(p)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedPrescription && (
        <div
          className="prescription-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetails()
          }}
        >
          <div className="prescription-modal" role="dialog" aria-modal="true">
            <div className="prescription-modal-header">
              <div>
                <span className="eyebrow">Prescription Review</span>
                <h3>{getPrescriptionCode(selectedPrescription)}</h3>
              </div>
              <button
                type="button"
                className="prescription-modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="prescription-modal-body">
              <div className="prescription-detail-status">
                <span>Status</span>
                <span className={getStatusClass(selectedPrescription.status)}>
                  {formatStatus(selectedPrescription.status)}
                </span>
              </div>

              <div className="prescription-detail-grid">
                <div>
                  <span className="prescription-detail-label">Customer</span>
                  <strong>{getCustomerName(selectedPrescription)}</strong>
                </div>
                <div>
                  <span className="prescription-detail-label">
                    Prescription Date
                  </span>
                  <strong>
                    {formatDate(selectedPrescription.prescription_date)}
                  </strong>
                </div>
                <div>
                  <span className="prescription-detail-label">Uploaded</span>
                  <strong>{formatDate(selectedPrescription.created_at)}</strong>
                </div>
                <div>
                  <span className="prescription-detail-label">
                    Verified At
                  </span>
                  <strong>
                    {formatDate(selectedPrescription.verified_at)}
                  </strong>
                </div>
              </div>

              {selectedPrescription.notes && (
                <div className="prescription-detail-section">
                  <h4>Customer Notes</h4>
                  <p className="prescription-notes">
                    {selectedPrescription.notes}
                  </p>
                </div>
              )}

              <div className="prescription-detail-section">
                <h4>Prescription File</h4>

                {isLoadingUrl ? (
                  <p>Loading file…</p>
                ) : signedUrl ? (
                  <div className="prescription-image-wrap">
                    {signedUrl.toLowerCase().includes('.pdf') ? (
                      <iframe
                        src={signedUrl}
                        title="Prescription PDF"
                        className="prescription-pdf"
                      />
                    ) : (
                      <img
                        src={signedUrl}
                        alt="Prescription"
                        className="prescription-image"
                      />
                    )}
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="prescription-download"
                    >
                      Open in new tab
                    </a>
                  </div>
                ) : (
                  <p>No file available.</p>
                )}
              </div>
            </div>

            <div className="prescription-modal-footer">
              <button type="button" onClick={closeDetails}>
                Close
              </button>

              {selectedPrescription.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleVerify(selectedPrescription.prescription_id)
                    }
                    disabled={updatingId === selectedPrescription.prescription_id}
                  >
                    {updatingId === selectedPrescription.prescription_id
                      ? 'Updating…'
                      : 'Verify'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleReject(selectedPrescription.prescription_id)
                    }
                    disabled={updatingId === selectedPrescription.prescription_id}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PrescriptionsPage