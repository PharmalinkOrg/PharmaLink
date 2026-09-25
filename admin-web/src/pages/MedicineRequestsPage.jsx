// File: admin-web/src/pages/MedicineRequestsPage.jsx

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

const emptyResponseForm = {
  status: '',
  medicine_id: '',
  available_quantity: '',
  unit_price: '',
  notes: '',
}

function formatDate(value) {
  if (!value) return '—'

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

function formatStatus(status) {
  return String(status || 'UNKNOWN')
    .replaceAll('_', ' ')
}

function getCustomerName(customer) {
  if (!customer) return 'Unknown customer'

  const name = [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || customer.email || 'Unknown customer'
}

function getItemName(item) {
  if (!item) return 'Unknown medicine'

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
  return [
    item?.dosage ||
      item?.medicines?.dosage,

    item?.dosage_form ||
      item?.medicines?.dosage_form,
  ]
    .filter(Boolean)
    .join(' • ')
}

function getMedicineName(medicine) {
  if (!medicine) return 'Unknown medicine'

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
    `Medicine #${medicine.medicine_id}`
  )
}

function getMedicineMeta(medicine) {
  return [
    medicine?.dosage,
    medicine?.dosage_form,
  ]
    .filter(Boolean)
    .join(' • ')
}

function MedicineRequestsPage() {
  const {
    accessToken,
    user,
  } = useAuth()

  const [requests, setRequests] =
    useState([])

  const [medicines, setMedicines] =
    useState([])

  const [selectedRequest, setSelectedRequest] =
    useState(null)

  const [responseForm, setResponseForm] =
    useState(emptyResponseForm)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [notice, setNotice] =
    useState('')

  const [searchTerm, setSearchTerm] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('ALL')

  // =========================================================
  // PATHS
  // =========================================================

  const medicinesPath =
    user?.pharmacy_id
      ? `/medicines?pharmacy_id=${user.pharmacy_id}`
      : null

  // =========================================================
  // CURRENT PHARMACY RESPONSE
  // =========================================================

  function getMyResponse(request) {
    if (
      !request ||
      !Array.isArray(
        request.medicine_request_responses,
      ) ||
      !user?.pharmacy_id
    ) {
      return null
    }

    return (
      request.medicine_request_responses.find(
        (response) =>
          Number(response.pharmacy_id) ===
          Number(user.pharmacy_id),
      ) || null
    )
  }

  // =========================================================
  // LOAD REQUESTS
  // =========================================================

  async function loadRequests() {
    try {
      setIsLoading(true)
      setError('')

      const response = await apiRequest(
        '/medicine-requests/pharmacy',
        {
          token: accessToken,
        },
      )

      setRequests(
        Array.isArray(response?.data)
          ? response.data
          : [],
      )
    } catch (requestError) {
      console.error(
        'Load medicine requests error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to load medicine requests.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  // =========================================================
  // LOAD PHARMACY MEDICINES
  // =========================================================

  async function loadMedicines() {
    if (!medicinesPath) {
      setMedicines([])
      return
    }

    try {
      const response = await apiRequest(
        medicinesPath,
        {
          token: accessToken,
        },
      )

      setMedicines(
        Array.isArray(response?.data)
          ? response.data
          : [],
      )
    } catch (requestError) {
      console.error(
        'Load pharmacy medicines error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to load pharmacy medicines.',
      )
    }
  }

  useEffect(() => {
    if (!accessToken || !user?.pharmacy_id) {
      return
    }

    loadRequests()
    loadMedicines()
  }, [
    accessToken,
    user?.pharmacy_id,
  ])

  // =========================================================
  // FILTERS
  // =========================================================

  const filteredRequests = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase()

    return requests.filter((request) => {
      const customerName =
        getCustomerName(
          request.users,
        ).toLowerCase()

      const medicineText = (
        request.medicine_request_items || []
      )
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
        customerName.includes(query) ||
        medicineText.includes(query) ||
        requestId.includes(query)

      const myResponse =
        getMyResponse(request)

      let matchesStatus = true

      if (statusFilter === 'OPEN') {
        matchesStatus =
          request.status === 'OPEN'
      }

      if (statusFilter === 'NOT_RESPONDED') {
        matchesStatus =
          request.status === 'OPEN' &&
          !myResponse
      }

      if (statusFilter === 'RESPONDED') {
        matchesStatus =
          Boolean(myResponse)
      }

      if (statusFilter === 'AVAILABLE') {
        matchesStatus =
          myResponse?.status ===
          'AVAILABLE'
      }

      if (
        statusFilter ===
        'PARTIALLY_AVAILABLE'
      ) {
        matchesStatus =
          myResponse?.status ===
          'PARTIALLY_AVAILABLE'
      }

      if (statusFilter === 'UNAVAILABLE') {
        matchesStatus =
          myResponse?.status ===
          'UNAVAILABLE'
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
    user?.pharmacy_id,
  ])

  // =========================================================
  // OPEN DETAILS
  // =========================================================

  async function openRequest(requestId) {
    try {
      setError('')
      setNotice('')

      const response = await apiRequest(
        `/medicine-requests/pharmacy/${requestId}`,
        {
          token: accessToken,
        },
      )

      const request = response?.data

      if (!request) {
        throw new Error(
          'Medicine request was not found.',
        )
      }

      setSelectedRequest(request)

      const myResponse =
        getMyResponse(request)

      if (myResponse) {
        setResponseForm({
          status:
            myResponse.status || '',

          medicine_id:
            myResponse.medicine_id
              ? String(
                  myResponse.medicine_id,
                )
              : '',

          available_quantity:
            String(
              myResponse.available_quantity ??
                '',
            ),

          unit_price:
            myResponse.unit_price ??
            '',

          notes:
            myResponse.notes || '',
        })
      } else {
        setResponseForm(
          emptyResponseForm,
        )
      }
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

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  function closeRequest() {
    if (isSaving) {
      return
    }

    setSelectedRequest(null)
    setResponseForm(
      emptyResponseForm,
    )
  }

  // =========================================================
  // UPDATE RESPONSE FORM
  // =========================================================

  function updateResponseField(event) {
    const {
      name,
      value,
    } = event.target

    setResponseForm((current) => {
      if (
        name === 'status' &&
        value === 'UNAVAILABLE'
      ) {
        return {
          ...current,
          status: value,
          medicine_id: '',
          available_quantity: '0',
          unit_price: '',
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  // =========================================================
  // SUBMIT RESPONSE
  // =========================================================

  async function submitResponse(event) {
    event.preventDefault()

    if (!selectedRequest) {
      return
    }

    setError('')
    setNotice('')

    const status =
      responseForm.status

    if (
      ![
        'AVAILABLE',
        'PARTIALLY_AVAILABLE',
        'UNAVAILABLE',
      ].includes(status)
    ) {
      setError(
        'Please select an availability response.',
      )

      return
    }

    let availableQuantity = 0

    if (status !== 'UNAVAILABLE') {
      availableQuantity = Number(
        responseForm.available_quantity,
      )

      if (
        !Number.isInteger(
          availableQuantity,
        ) ||
        availableQuantity <= 0
      ) {
        setError(
          'Available quantity must be a whole number greater than zero.',
        )

        return
      }
    }

    let unitPrice = null

    if (
      responseForm.unit_price !== ''
    ) {
      unitPrice = Number(
        responseForm.unit_price,
      )

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        setError(
          'Unit price must be a valid non-negative amount.',
        )

        return
      }
    }

    const payload = {
      status,

      available_quantity:
        status === 'UNAVAILABLE'
          ? 0
          : availableQuantity,

      medicine_id:
        status === 'UNAVAILABLE'
          ? null
          : responseForm.medicine_id
            ? Number(
                responseForm.medicine_id,
              )
            : null,

      unit_price:
        status === 'UNAVAILABLE'
          ? null
          : unitPrice,

      notes:
        responseForm.notes.trim() ||
        null,
    }

    try {
      setIsSaving(true)

      const response = await apiRequest(
        `/medicine-requests/${selectedRequest.medicine_request_id}/respond`,
        {
          token: accessToken,
          method: 'POST',
          body: payload,
        },
      )

      setNotice(
        response?.message ||
          'Medicine request response saved.',
      )

      await loadRequests()

      const refreshed =
        await apiRequest(
          `/medicine-requests/pharmacy/${selectedRequest.medicine_request_id}`,
          {
            token: accessToken,
          },
        )

      setSelectedRequest(
        refreshed?.data || null,
      )

      const savedResponse =
        response?.data

      if (savedResponse) {
        setResponseForm({
          status:
            savedResponse.status || '',

          medicine_id:
            savedResponse.medicine_id
              ? String(
                  savedResponse.medicine_id,
                )
              : '',

          available_quantity:
            String(
              savedResponse.available_quantity ??
                '',
            ),

          unit_price:
            savedResponse.unit_price ??
            '',

          notes:
            savedResponse.notes || '',
        })
      }
    } catch (requestError) {
      console.error(
        'Submit medicine request response error:',
        requestError,
      )

      setError(
        requestError.message ||
          'Unable to save pharmacy response.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  // =========================================================
  // SELECTED REQUEST DATA
  // =========================================================

  const selectedMyResponse =
    selectedRequest
      ? getMyResponse(
          selectedRequest,
        )
      : null

  const requestIsOpen =
    selectedRequest?.status ===
    'OPEN'

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section className="medicine-requests-page">

      {/* PAGE HEADING */}

      <div className="page-heading">
        <div>
          <h2 className="page-title">
            Medicine Requests
          </h2>

          <p className="page-copy">
            Review medicine requests from
            customers and respond with your
            pharmacy's availability.
          </p>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p className="form-notice">
          {notice}
        </p>
      )}

      {/* FILTERS */}

      <div className="medicine-request-toolbar">
        <div className="medicine-request-search">
          <input
            type="search"
            placeholder="Search request, customer, or medicine..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
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

          <option value="NOT_RESPONDED">
            Needs Response
          </option>

          <option value="RESPONDED">
            Responded
          </option>

          <option value="OPEN">
            Open Requests
          </option>

          <option value="AVAILABLE">
            Responded: Available
          </option>

          <option value="PARTIALLY_AVAILABLE">
            Responded: Partially Available
          </option>

          <option value="UNAVAILABLE">
            Responded: Unavailable
          </option>
        </select>
      </div>

      {/* TABLE */}

      <div className="medicine-request-table-card">
        {isLoading ? (
          <div className="medicine-request-empty">
            <p>
              Loading medicine requests…
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="medicine-request-empty">
            <h3>
              No medicine requests found
            </h3>

            <p>
              There are no requests matching
              the current filters.
            </p>
          </div>
        ) : (
          <div className="medicine-request-table-scroll">
            <table className="medicine-request-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Customer</th>
                  <th>Medicine</th>
                  <th>Requested</th>
                  <th>Request Status</th>
                  <th>Your Response</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map(
                  (request) => {
                    const items =
                      request.medicine_request_items ||
                      []

                    const firstItem =
                      items[0]

                    const myResponse =
                      getMyResponse(
                        request,
                      )

                    return (
                      <tr
                        key={
                          request.medicine_request_id
                        }
                      >
                        <td>
                          <strong>
                            #
                            {
                              request.medicine_request_id
                            }
                          </strong>

                          <small className="medicine-request-date">
                            {formatDate(
                              request.created_at,
                            )}
                          </small>
                        </td>

                        <td>
                          {getCustomerName(
                            request.users,
                          )}
                        </td>

                        <td>
                          {firstItem ? (
                            <div className="medicine-request-medicine-cell">
                              <strong>
                                {getItemName(
                                  firstItem,
                                )}
                              </strong>

                              {getItemMeta(
                                firstItem,
                              ) && (
                                <small>
                                  {getItemMeta(
                                    firstItem,
                                  )}
                                </small>
                              )}

                              {items.length >
                                1 && (
                                <small>
                                  +
                                  {items.length -
                                    1}{' '}
                                  more item
                                  {items.length -
                                    1 !==
                                  1
                                    ? 's'
                                    : ''}
                                </small>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td>
                          {firstItem
                            ?.requested_quantity ??
                            '—'}
                        </td>

                        <td>
                          <span
                            className={`medicine-request-status ${String(
                              request.status,
                            ).toLowerCase()}`}
                          >
                            {formatStatus(
                              request.status,
                            )}
                          </span>
                        </td>

                        <td>
                          {myResponse ? (
                            <span
                              className={`medicine-response-status ${String(
                                myResponse.status,
                              ).toLowerCase()}`}
                            >
                              {formatStatus(
                                myResponse.status,
                              )}
                            </span>
                          ) : (
                            <span className="medicine-response-pending">
                              Not responded
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="medicine-request-view-button"
                            onClick={() =>
                              openRequest(
                                request.medicine_request_id,
                              )
                            }
                          >
                            {myResponse
                              ? 'View / Edit'
                              : 'View & Respond'}
                          </button>
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}

      {selectedRequest && (
        <div
          className="medicine-request-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRequest()
            }
          }}
        >
          <div
            className="medicine-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="medicine-request-modal-title"
          >
            {/* MODAL HEADER */}

            <div className="medicine-request-modal-header">
              <div>
                <span className="medicine-request-modal-eyebrow">
                  Medicine Request
                </span>

                <h3 id="medicine-request-modal-title">
                  Request #
                  {
                    selectedRequest.medicine_request_id
                  }
                </h3>

                <p>
                  Submitted{' '}
                  {formatDate(
                    selectedRequest.created_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                className="medicine-request-close"
                onClick={closeRequest}
                disabled={isSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="medicine-request-modal-body">

              {/* REQUEST STATE */}

              <div className="medicine-request-state-row">
                <span>
                  Request Status
                </span>

                <span
                  className={`medicine-request-status ${String(
                    selectedRequest.status,
                  ).toLowerCase()}`}
                >
                  {formatStatus(
                    selectedRequest.status,
                  )}
                </span>
              </div>

              {/* CUSTOMER */}

              <section className="medicine-request-detail-section">
                <h4>
                  Customer
                </h4>

                <div className="medicine-request-customer-grid">
                  <div>
                    <span>
                      Name
                    </span>

                    <strong>
                      {getCustomerName(
                        selectedRequest.users,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedRequest.users
                        ?.email || '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {selectedRequest.users
                        ?.phone || '—'}
                    </strong>
                  </div>
                </div>
              </section>

              {/* REQUESTED MEDICINES */}

              <section className="medicine-request-detail-section">
                <h4>
                  Requested Medicine
                </h4>

                <div className="medicine-request-items">
                  {(
                    selectedRequest.medicine_request_items ||
                    []
                  ).map((item) => (
                    <article
                      className="medicine-request-item"
                      key={
                        item.medicine_request_item_id
                      }
                    >
                      <div className="medicine-request-item-main">
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
                          <span className="medicine-request-rx">
                            Prescription required
                          </span>
                        )}
                      </div>

                      <div className="medicine-request-item-quantity">
                        <span>
                          Requested
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

              {/* CUSTOMER NOTES */}

              <section className="medicine-request-detail-section">
                <h4>
                  Customer Notes
                </h4>

                <div className="medicine-request-notes">
                  {selectedRequest.notes ||
                    'No additional notes provided.'}
                </div>
              </section>

              {/* RESPONSE */}

              <section className="medicine-request-response-section">
                <div className="medicine-request-response-heading">
                  <div>
                    <h4>
                      Your Pharmacy Response
                    </h4>

                    <p>
                      Tell the customer whether
                      your pharmacy can fulfill
                      this request.
                    </p>
                  </div>

                  {selectedMyResponse && (
                    <span
                      className={`medicine-response-status ${String(
                        selectedMyResponse.status,
                      ).toLowerCase()}`}
                    >
                      {formatStatus(
                        selectedMyResponse.status,
                      )}
                    </span>
                  )}
                </div>

                {!requestIsOpen ? (
                  <div className="medicine-request-closed-message">
                    This request is{' '}
                    {formatStatus(
                      selectedRequest.status,
                    ).toLowerCase()}
                    . Pharmacy responses can no
                    longer be changed.
                  </div>
                ) : (
                  <form
                    className="medicine-response-form"
                    onSubmit={
                      submitResponse
                    }
                  >
                    {/* STATUS */}

                    <label className="medicine-response-field">
                      <span>
                        Availability *
                      </span>

                      <select
                        name="status"
                        value={
                          responseForm.status
                        }
                        onChange={
                          updateResponseField
                        }
                        disabled={isSaving}
                        required
                      >
                        <option value="">
                          Select availability
                        </option>

                        <option value="AVAILABLE">
                          Available
                        </option>

                        <option value="PARTIALLY_AVAILABLE">
                          Partially Available
                        </option>

                        <option value="UNAVAILABLE">
                          Unavailable
                        </option>
                      </select>
                    </label>

                    {responseForm.status &&
                      responseForm.status !==
                        'UNAVAILABLE' && (
                        <>
                          {/* MATCHING MEDICINE */}

                          <label className="medicine-response-field">
                            <span>
                              Matching Pharmacy
                              Medicine
                              <small>
                                Optional
                              </small>
                            </span>

                            <select
                              name="medicine_id"
                              value={
                                responseForm.medicine_id
                              }
                              onChange={
                                updateResponseField
                              }
                              disabled={
                                isSaving
                              }
                            >
                              <option value="">
                                No medicine selected
                              </option>

                              {medicines.map(
                                (
                                  medicine,
                                ) => (
                                  <option
                                    key={
                                      medicine.medicine_id
                                    }
                                    value={
                                      medicine.medicine_id
                                    }
                                  >
                                    {getMedicineName(
                                      medicine,
                                    )}
                                    {getMedicineMeta(
                                      medicine,
                                    )
                                      ? ` — ${getMedicineMeta(
                                          medicine,
                                        )}`
                                      : ''}
                                  </option>
                                ),
                              )}
                            </select>

                            <small className="medicine-response-help">
                              Select the matching
                              medicine from your
                              pharmacy catalog when
                              applicable.
                            </small>
                          </label>

                          <div className="medicine-response-row">
                            {/* QUANTITY */}

                            <label className="medicine-response-field">
                              <span>
                                Available Quantity *
                              </span>

                              <input
                                name="available_quantity"
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                value={
                                  responseForm.available_quantity
                                }
                                onChange={
                                  updateResponseField
                                }
                                disabled={
                                  isSaving
                                }
                                required
                              />
                            </label>

                            {/* PRICE */}

                            <label className="medicine-response-field">
                              <span>
                                Unit Price
                                <small>
                                  Optional
                                </small>
                              </span>

                              <div className="medicine-response-price">
                                <span>
                                  ₱
                                </span>

                                <input
                                  name="unit_price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    responseForm.unit_price
                                  }
                                  onChange={
                                    updateResponseField
                                  }
                                  disabled={
                                    isSaving
                                  }
                                  placeholder="0.00"
                                />
                              </div>
                            </label>
                          </div>
                        </>
                      )}

                    {/* NOTES */}

                    <label className="medicine-response-field">
                      <span>
                        Response Notes
                        <small>
                          Optional
                        </small>
                      </span>

                      <textarea
                        name="notes"
                        rows="4"
                        maxLength="500"
                        value={
                          responseForm.notes
                        }
                        onChange={
                          updateResponseField
                        }
                        disabled={isSaving}
                        placeholder={
                          responseForm.status ===
                          'UNAVAILABLE'
                            ? 'Optional note for the customer...'
                            : 'Example: Currently available for pickup during pharmacy hours.'
                        }
                      />

                      <small className="medicine-response-character-count">
                        {
                          responseForm.notes
                            .length
                        }
                        /500
                      </small>
                    </label>

                    {/* ACTIONS */}

                    <div className="medicine-response-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={
                          closeRequest
                        }
                        disabled={
                          isSaving
                        }
                      >
                        Close
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          isSaving ||
                          !responseForm.status
                        }
                      >
                        {isSaving
                          ? 'Saving…'
                          : selectedMyResponse
                            ? 'Update Response'
                            : 'Submit Response'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default MedicineRequestsPage