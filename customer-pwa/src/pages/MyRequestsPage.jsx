// File: customer-pwa/src/pages/MyRequestsPage.jsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  PackageSearch,
  Phone,
  Pill,
  RefreshCw,
  Search,
  Store,
  X,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../components/auth/useAuth'
import { api } from '../lib/api'

// ============================================================
// HELPERS
// ============================================================

function formatStatus(value) {
  return String(value || 'UNKNOWN')
    .replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return null
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}

function getItemName(item) {
  if (!item) {
    return 'Unknown medicine'
  }

  const genericName =
    item.medicine_name ||
    item.medicines?.generic_name ||
    ''

  const brandName =
    item.brand_name ||
    item.medicines?.brand_name ||
    ''

  if (brandName && genericName) {
    return `${brandName} (${genericName})`
  }

  return (
    brandName ||
    genericName ||
    'Unnamed medicine'
  )
}

function getItemMeta(item) {
  if (!item) {
    return ''
  }

  return [
    item.dosage ||
      item.medicines?.dosage,

    item.dosage_form ||
      item.medicines?.dosage_form,
  ]
    .filter(Boolean)
    .join(' • ')
}

function getResponseMedicineName(response) {
  const medicine = response?.medicines

  if (!medicine) {
    return null
  }

  const genericName =
    medicine.generic_name?.trim() || ''

  const brandName =
    medicine.brand_name?.trim() || ''

  if (brandName && genericName) {
    return `${brandName} (${genericName})`
  }

  return (
    brandName ||
    genericName ||
    null
  )
}

function getResponseMedicineMeta(response) {
  const medicine = response?.medicines

  if (!medicine) {
    return ''
  }

  return [
    medicine.dosage,
    medicine.dosage_form,
  ]
    .filter(Boolean)
    .join(' • ')
}

function getFirstItem(request) {
  return (
    request?.medicine_request_items?.[0] ||
    null
  )
}

function getResponseCount(request) {
  return Array.isArray(
    request?.medicine_request_responses,
  )
    ? request.medicine_request_responses.length
    : 0
}

function getPositiveResponseCount(request) {
  if (
    !Array.isArray(
      request?.medicine_request_responses,
    )
  ) {
    return 0
  }

  return request.medicine_request_responses.filter(
    (response) =>
      response.status === 'AVAILABLE' ||
      response.status ===
        'PARTIALLY_AVAILABLE',
  ).length
}

function getResponseIcon(status) {
  switch (status) {
    case 'AVAILABLE':
      return CheckCircle2

    case 'PARTIALLY_AVAILABLE':
      return AlertCircle

    case 'UNAVAILABLE':
      return XCircle

    default:
      return Clock3
  }
}

// ============================================================
// COMPONENT
// ============================================================

function MyRequestsPage() {
  const navigate = useNavigate()

  const {
    user,
    loading: authLoading,
  } = useAuth()

  const [requests, setRequests] =
    useState([])

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState(null)

  const [searchTerm, setSearchTerm] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('ALL')

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [isCancelling, setIsCancelling] =
    useState(false)

  const [error, setError] =
    useState('')

  const [notice, setNotice] =
    useState('')

  // ==========================================================
  // AUTH
  // ==========================================================

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', {
        state: {
          from: '/my-requests',
        },
      })
    }
  }, [
    authLoading,
    user,
    navigate,
  ])

  // ==========================================================
  // LOAD REQUESTS
  // ==========================================================

  async function loadRequests({
    refreshing = false,
  } = {}) {
    try {
      if (refreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError('')

      const data =
        await api.getMyMedicineRequests()

      setRequests(
        Array.isArray(data)
          ? data
          : [],
      )
    } catch (requestError) {
      console.error(
        'Load medicine requests error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to load your medicine requests.',
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadRequests()
    }
  }, [
    authLoading,
    user,
  ])

  // ==========================================================
  // FILTERS
  // ==========================================================

  const filteredRequests = useMemo(() => {
    const query =
      searchTerm
        .trim()
        .toLowerCase()

    return requests.filter((request) => {
      const items =
        request.medicine_request_items ||
        []

      const medicineText = items
        .map((item) =>
          [
            getItemName(item),
            getItemMeta(item),
          ]
            .filter(Boolean)
            .join(' '),
        )
        .join(' ')
        .toLowerCase()

      const requestId =
        String(
          request.medicine_request_id,
        )

      const matchesSearch =
        !query ||
        medicineText.includes(query) ||
        requestId.includes(query)

      let matchesStatus = true

      if (statusFilter !== 'ALL') {
        matchesStatus =
          request.status ===
          statusFilter
      }

      if (
        statusFilter ===
        'HAS_RESPONSES'
      ) {
        matchesStatus =
          getResponseCount(request) > 0
      }

      if (
        statusFilter ===
        'AVAILABLE'
      ) {
        matchesStatus =
          getPositiveResponseCount(
            request,
          ) > 0
      }

      return (
        matchesSearch &&
        matchesStatus
      )
    })
  }, [
    requests,
    searchTerm,
    statusFilter,
  ])

  // ==========================================================
  // OPEN REQUEST
  // ==========================================================

  async function openRequest(requestId) {
    try {
      setError('')
      setNotice('')

      const data =
        await api.getMedicineRequestById(
          requestId,
        )

      if (!data) {
        throw new Error(
          'Medicine request was not found.',
        )
      }

      setSelectedRequest(data)
    } catch (requestError) {
      console.error(
        'Open medicine request error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to load request details.',
      )
    }
  }

  // ==========================================================
  // CANCEL REQUEST
  // ==========================================================

  async function cancelRequest() {
    if (
      !selectedRequest ||
      selectedRequest.status !== 'OPEN'
    ) {
      return
    }

    const confirmed =
      window.confirm(
        'Cancel this medicine request? Partner pharmacies will no longer be able to respond.',
      )

    if (!confirmed) {
      return
    }

    try {
      setIsCancelling(true)
      setError('')
      setNotice('')

      const requestId =
        selectedRequest.medicine_request_id

      const data =
        await api.cancelMedicineRequest(
          requestId,
        )

      setSelectedRequest(data)

      setRequests((current) =>
        current.map((request) =>
          Number(
            request.medicine_request_id,
          ) === Number(requestId)
            ? data
            : request,
        ),
      )

      setNotice(
        'Medicine request cancelled.',
      )
    } catch (requestError) {
      console.error(
        'Cancel medicine request error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to cancel medicine request.',
      )
    } finally {
      setIsCancelling(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  if (authLoading || isLoading) {
    return (
      <main className="my-requests-page">
        <div className="my-requests-container">
          <div className="my-requests-loading">
            <RefreshCw
              size={22}
              className="spinner"
            />

            <span>
              Loading your requests...
            </span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="my-requests-page">
      <div className="my-requests-container">

        {/* ================================================
            HEADER
        ================================================= */}

        <header className="my-requests-header">
          <div>
            <span className="my-requests-eyebrow">
              Medicine Requests
            </span>

            <h1>
              My Requests
            </h1>

            <p>
              Track the medicines you've requested
              and view responses from PharmaLink
              partner pharmacies.
            </p>
          </div>

          <button
            type="button"
            className="my-requests-refresh"
            onClick={() =>
              loadRequests({
                refreshing: true,
              })
            }
            disabled={isRefreshing}
          >
            <RefreshCw
              size={17}
              className={
                isRefreshing
                  ? 'spinner'
                  : ''
              }
            />

            <span>
              Refresh
            </span>
          </button>
        </header>

        {/* ================================================
            ALERTS
        ================================================= */}

        {error && (
          <div
            className="my-requests-alert error"
            role="alert"
          >
            <AlertCircle size={18} />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            className="my-requests-alert success"
            role="status"
          >
            <CheckCircle2 size={18} />

            <span>
              {notice}
            </span>

            <button
              type="button"
              onClick={() =>
                setNotice('')
              }
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ================================================
            TOOLBAR
        ================================================= */}

        <div className="my-requests-toolbar">
          <div className="my-requests-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search medicine or request number"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() =>
                  setSearchTerm('')
                }
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              All Requests
            </option>

            <option value="OPEN">
              Open
            </option>

            <option value="HAS_RESPONSES">
              With Responses
            </option>

            <option value="AVAILABLE">
              Pharmacy Available
            </option>

            <option value="FULFILLED">
              Fulfilled
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

            <option value="EXPIRED">
              Expired
            </option>
          </select>
        </div>

        {/* ================================================
            REQUEST LIST
        ================================================= */}

        {filteredRequests.length === 0 ? (
          <section className="my-requests-empty">
            <div className="my-requests-empty-icon">
              <PackageSearch size={30} />
            </div>

            <h2>
              {requests.length === 0
                ? 'No medicine requests yet'
                : 'No matching requests'}
            </h2>

            <p>
              {requests.length === 0
                ? 'When you request a medicine, you can track pharmacy responses here.'
                : 'Try changing your search or filter.'}
            </p>

            {requests.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/request-medicine',
                  )
                }
              >
                Request a Medicine
              </button>
            )}
          </section>
        ) : (
          <div className="my-requests-list">
            {filteredRequests.map(
              (request) => {
                const firstItem =
                  getFirstItem(request)

                const itemCount =
                  request
                    .medicine_request_items
                    ?.length || 0

                const responseCount =
                  getResponseCount(
                    request,
                  )

                const availableCount =
                  getPositiveResponseCount(
                    request,
                  )

                return (
                  <article
                    className="my-request-card"
                    key={
                      request.medicine_request_id
                    }
                  >
                    <button
                      type="button"
                      className="my-request-card-button"
                      onClick={() =>
                        openRequest(
                          request.medicine_request_id,
                        )
                      }
                    >
                      <div className="my-request-card-top">
                        <div className="my-request-number">
                          Request #
                          {
                            request.medicine_request_id
                          }
                        </div>

                        <span
                          className={`my-request-status ${String(
                            request.status,
                          ).toLowerCase()}`}
                        >
                          {formatStatus(
                            request.status,
                          )}
                        </span>
                      </div>

                      <div className="my-request-medicine">
                        <div className="my-request-medicine-icon">
                          <Pill size={20} />
                        </div>

                        <div className="my-request-medicine-copy">
                          <strong>
                            {firstItem
                              ? getItemName(
                                  firstItem,
                                )
                              : 'Medicine request'}
                          </strong>

                          {firstItem &&
                            getItemMeta(
                              firstItem,
                            ) && (
                              <span>
                                {getItemMeta(
                                  firstItem,
                                )}
                              </span>
                            )}

                          {itemCount > 1 && (
                            <small>
                              +
                              {itemCount - 1}{' '}
                              more item
                              {itemCount - 1 !==
                              1
                                ? 's'
                                : ''}
                            </small>
                          )}
                        </div>

                        <ChevronRight
                          size={20}
                          className="my-request-chevron"
                        />
                      </div>

                      <div className="my-request-card-footer">
                        <span>
                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            request.created_at,
                          )}
                        </span>

                        {responseCount === 0 ? (
                          <span className="my-request-awaiting">
                            <Clock3
                              size={14}
                            />
                            Waiting for pharmacy
                            responses
                          </span>
                        ) : (
                          <span className="my-request-response-summary">
                            <Store size={14} />

                            {responseCount}{' '}
                            response
                            {responseCount !== 1
                              ? 's'
                              : ''}

                            {availableCount > 0 &&
                              ` • ${availableCount} available`}
                          </span>
                        )}
                      </div>
                    </button>
                  </article>
                )
              },
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          DETAILS MODAL
      =================================================== */}

      {selectedRequest && (
        <div
          className="my-request-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRequest(null)
            }
          }}
        >
          <div
            className="my-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-request-modal-title"
          >
            {/* HEADER */}

            <div className="my-request-modal-header">
              <div>
                <span>
                  Medicine Request
                </span>

                <h2 id="my-request-modal-title">
                  Request #
                  {
                    selectedRequest.medicine_request_id
                  }
                </h2>

                <p>
                  Submitted{' '}
                  {formatDateTime(
                    selectedRequest.created_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                className="my-request-modal-close"
                onClick={() =>
                  setSelectedRequest(null)
                }
                aria-label="Close request"
              >
                <X size={20} />
              </button>
            </div>

            <div className="my-request-modal-body">

              {/* REQUEST STATUS */}

              <div className="my-request-detail-status">
                <span>
                  Request Status
                </span>

                <span
                  className={`my-request-status ${String(
                    selectedRequest.status,
                  ).toLowerCase()}`}
                >
                  {formatStatus(
                    selectedRequest.status,
                  )}
                </span>
              </div>

              {/* REQUESTED MEDICINES */}

              <section className="my-request-detail-section">
                <h3>
                  Requested Medicine
                </h3>

                <div className="my-request-items">
                  {(
                    selectedRequest.medicine_request_items ||
                    []
                  ).map((item) => (
                    <article
                      className="my-request-item"
                      key={
                        item.medicine_request_item_id
                      }
                    >
                      <div className="my-request-item-icon">
                        <Pill size={19} />
                      </div>

                      <div className="my-request-item-copy">
                        <strong>
                          {getItemName(
                            item,
                          )}
                        </strong>

                        {getItemMeta(
                          item,
                        ) && (
                          <span>
                            {getItemMeta(
                              item,
                            )}
                          </span>
                        )}

                        {item.medicines
                          ?.requires_prescription && (
                          <small className="my-request-rx">
                            Prescription required
                          </small>
                        )}
                      </div>

                      <div className="my-request-item-quantity">
                        <span>
                          Quantity
                        </span>

                        <strong>
                          {
                            item.requested_quantity
                          }
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* NOTES */}

              {selectedRequest.notes && (
                <section className="my-request-detail-section">
                  <h3>
                    Your Notes
                  </h3>

                  <div className="my-request-customer-notes">
                    {
                      selectedRequest.notes
                    }
                  </div>
                </section>
              )}

              {/* PHARMACY RESPONSES */}

              <section className="my-request-detail-section">
                <div className="my-request-response-title">
                  <div>
                    <h3>
                      Pharmacy Responses
                    </h3>

                    <p>
                      Compare responses from
                      PharmaLink partner
                      pharmacies.
                    </p>
                  </div>

                  <span>
                    {getResponseCount(
                      selectedRequest,
                    )}
                  </span>
                </div>

                {!selectedRequest
                  .medicine_request_responses
                  ?.length ? (
                  <div className="my-request-no-responses">
                    <Clock3 size={24} />

                    <strong>
                      Waiting for responses
                    </strong>

                    <p>
                      Partner pharmacies can
                      respond while this request
                      remains open.
                    </p>
                  </div>
                ) : (
                  <div className="my-request-responses">
                    {selectedRequest.medicine_request_responses.map(
                      (response) => {
                        const ResponseIcon =
                          getResponseIcon(
                            response.status,
                          )

                        const medicineName =
                          getResponseMedicineName(
                            response,
                          )

                        const medicineMeta =
                          getResponseMedicineMeta(
                            response,
                          )

                        const price =
                          formatMoney(
                            response.unit_price,
                          )

                        return (
                          <article
                            className={`my-request-response-card ${String(
                              response.status,
                            ).toLowerCase()}`}
                            key={
                              response.response_id
                            }
                          >
                            {/* RESPONSE HEADER */}

                            <div className="my-request-response-header">
                              <div className="my-request-response-pharmacy">
                                <div className="my-request-pharmacy-icon">
                                  <Building2
                                    size={19}
                                  />
                                </div>

                                <div>
                                  <strong>
                                    {response
                                      .pharmacies
                                      ?.name ||
                                      'Partner Pharmacy'}
                                  </strong>

                                  {response
                                    .pharmacies
                                    ?.address && (
                                    <span>
                                      <MapPin
                                        size={
                                          12
                                        }
                                      />

                                      {
                                        response
                                          .pharmacies
                                          .address
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`my-response-status ${String(
                                  response.status,
                                ).toLowerCase()}`}
                              >
                                <ResponseIcon
                                  size={14}
                                />

                                {formatStatus(
                                  response.status,
                                )}
                              </span>
                            </div>

                            {/* AVAILABILITY */}

                            {response.status !==
                              'UNAVAILABLE' && (
                              <div className="my-request-response-facts">
                                <div>
                                  <span>
                                    Available
                                    Quantity
                                  </span>

                                  <strong>
                                    {
                                      response.available_quantity
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Unit Price
                                  </span>

                                  <strong>
                                    {price ||
                                      'Not provided'}
                                  </strong>
                                </div>
                              </div>
                            )}

                            {/* MATCHED MEDICINE */}

                            {medicineName && (
                              <div className="my-request-matched-medicine">
                                <Pill
                                  size={16}
                                />

                                <div>
                                  <span>
                                    Pharmacy's
                                    matching medicine
                                  </span>

                                  <strong>
                                    {
                                      medicineName
                                    }
                                  </strong>

                                  {medicineMeta && (
                                    <small>
                                      {
                                        medicineMeta
                                      }
                                    </small>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* RESPONSE NOTES */}

                            {response.notes && (
                              <div className="my-request-response-notes">
                                <span>
                                  Pharmacy note
                                </span>

                                <p>
                                  {
                                    response.notes
                                  }
                                </p>
                              </div>
                            )}

                            {/* CONTACT */}

                            {(response.pharmacies
                              ?.contact_number ||
                              response.pharmacies
                                ?.email) && (
                              <div className="my-request-pharmacy-contact">
                                {response
                                  .pharmacies
                                  ?.contact_number && (
                                  <span>
                                    <Phone
                                      size={
                                        13
                                      }
                                    />

                                    {
                                      response
                                        .pharmacies
                                        .contact_number
                                    }
                                  </span>
                                )}

                                {response
                                  .pharmacies
                                  ?.email && (
                                  <span>
                                    {
                                      response
                                        .pharmacies
                                        .email
                                    }
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="my-request-response-time">
                              Responded{' '}
                              {formatDateTime(
                                response.responded_at,
                              )}
                            </div>
                          </article>
                        )
                      },
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* MODAL FOOTER */}

            <div className="my-request-modal-footer">
              {selectedRequest.status ===
                'OPEN' && (
                <button
                  type="button"
                  className="my-request-cancel-button"
                  onClick={
                    cancelRequest
                  }
                  disabled={
                    isCancelling
                  }
                >
                  {isCancelling
                    ? 'Cancelling...'
                    : 'Cancel Request'}
                </button>
              )}

              <button
                type="button"
                className="my-request-close-button"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MyRequestsPage