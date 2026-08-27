import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

function ReservationsPage() {
  const { accessToken } = useAuth()

  const [reservations, setReservations] = useState([])
  const [selectedReservation, setSelectedReservation] = useState(null)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingReservationId, setUpdatingReservationId] = useState(null)

  // --------------------------------------------------
  // Load reservations
  // --------------------------------------------------

  useEffect(() => {
    let isCurrent = true

    if (!accessToken) {
      setReservations([])
      setIsLoading(false)
      return undefined
    }

    setIsLoading(true)
    setError('')

    apiRequest('/reservations/pharmacy', {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setReservations(response.data || [])
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError.message ||
              'Failed to load reservations',
          )
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  // --------------------------------------------------
  // Update reservation status
  // --------------------------------------------------

  const updateReservationStatus = async (
    reservationId,
    status,
  ) => {
    try {
      setUpdatingReservationId(reservationId)
      setError('')
      setSuccessMessage('')

      const response = await apiRequest(
        `/reservations/${reservationId}/status`,
        {
          method: 'PATCH',
          token: accessToken,
          body: {
            status,
          },
        },
      )

      const updatedReservation = response.data

      setReservations((currentReservations) =>
        currentReservations.map((reservation) =>
          reservation.reservation_id === reservationId
            ? {
                ...reservation,
                ...updatedReservation,
              }
            : reservation,
        ),
      )

      // Also update the currently open modal.
      setSelectedReservation((currentReservation) => {
        if (
          !currentReservation ||
          currentReservation.reservation_id !==
            reservationId
        ) {
          return currentReservation
        }

        return {
          ...currentReservation,
          ...updatedReservation,
        }
      })

      setSuccessMessage(
        response.message ||
          `Reservation ${status.toLowerCase()} successfully`,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Failed to update reservation status',
      )
    } finally {
      setUpdatingReservationId(null)
    }
  }

  // --------------------------------------------------
  // Status actions
  // --------------------------------------------------

  const handleConfirm = (reservationId) => {
    updateReservationStatus(
      reservationId,
      'CONFIRMED',
    )
  }

  const handleCancel = (reservationId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this reservation?',
    )

    if (!confirmed) {
      return
    }

    updateReservationStatus(
      reservationId,
      'CANCELLED',
    )
  }

  const handleComplete = (reservationId) => {
    const confirmed = window.confirm(
      'Mark this reservation as completed?',
    )

    if (!confirmed) {
      return
    }

    updateReservationStatus(
      reservationId,
      'COMPLETED',
    )
  }

  // --------------------------------------------------
  // Modal
  // --------------------------------------------------

  const openReservationDetails = (reservation) => {
    setSelectedReservation(reservation)
    setError('')
    setSuccessMessage('')
  }

  const closeReservationDetails = () => {
    setSelectedReservation(null)
  }

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------

  const getStatusClass = (status) => {
    return `reservation-status ${
      status?.toLowerCase().replaceAll('_', '-') ||
      'unknown'
    }`
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'

    return status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      )
  }

  const formatDate = (date) => {
    if (!date) return '—'

    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (time) => {
    if (!time) return '—'

    const [hours, minutes] = time.split(':')

    if (
      hours === undefined ||
      minutes === undefined
    ) {
      return time
    }

    const date = new Date()

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0,
    )

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getCustomerName = (reservation) => {
    const customer =
      reservation.users || reservation.customer

    if (!customer) {
      return `Customer #${reservation.customer_id}`
    }

    return (
      `${customer.first_name || ''} ${
        customer.last_name || ''
      }`.trim() ||
      `Customer #${reservation.customer_id}`
    )
  }

  const getCustomerEmail = (reservation) => {
    const customer =
      reservation.users || reservation.customer

    return customer?.email || ''
  }

  const getCustomerPhone = (reservation) => {
    const customer =
      reservation.users || reservation.customer

    return customer?.phone || ''
  }

  const getItems = (reservation) => {
    return (
      reservation.reservation_items ||
      reservation.items ||
      []
    )
  }

  const getMedicineName = (item) => {
    const medicine = item.medicines

    if (!medicine) {
      return `Medicine #${item.medicine_id}`
    }

    return (
      medicine.brand_name ||
      medicine.generic_name ||
      `Medicine #${item.medicine_id}`
    )
  }

  const getMedicineDescription = (item) => {
    const medicine = item.medicines

    if (!medicine) {
      return ''
    }

    const parts = [
      medicine.generic_name,
      medicine.dosage,
      medicine.dosage_form,
    ].filter(Boolean)

    return parts.join(' • ')
  }

  const calculateItemTotal = (item) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unit_price) || 0

    return quantity * unitPrice
  }

  const calculateReservationTotal = (reservation) => {
    return getItems(reservation).reduce(
      (total, item) =>
        total + calculateItemTotal(item),
      0,
    )
  }

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )
  }

  // --------------------------------------------------
  // Summary
  // --------------------------------------------------

  const totalReservations = reservations.length

  const pendingReservations = reservations.filter(
    (reservation) =>
      reservation.status === 'PENDING',
  ).length

  const confirmedReservations = reservations.filter(
    (reservation) =>
      reservation.status === 'CONFIRMED',
  ).length

  const completedReservations = reservations.filter(
    (reservation) =>
      reservation.status === 'COMPLETED',
  ).length

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="reservations-page">
      {/* Page Heading */}

      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Pharmacy Operations
          </span>

          <h2 className="page-title">
            Reservations
          </h2>

          <p className="page-copy">
            Manage customer pickup reservations for
            your pharmacy.
          </p>
        </div>
      </div>

      {/* Error */}

      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Success */}

      {successMessage && (
        <p
          className="form-success"
          role="status"
        >
          {successMessage}
        </p>
      )}

      {/* Summary */}

      <div className="reservation-summary">
        <article className="reservation-summary-card">
          <span>Total Reservations</span>
          <strong>{totalReservations}</strong>
        </article>

        <article className="reservation-summary-card">
          <span>Pending</span>
          <strong>{pendingReservations}</strong>
        </article>

        <article className="reservation-summary-card">
          <span>Confirmed</span>
          <strong>{confirmedReservations}</strong>
        </article>

        <article className="reservation-summary-card">
          <span>Completed</span>
          <strong>{completedReservations}</strong>
        </article>
      </div>

      {/* Reservation Table */}

      <div className="reservation-table-wrap">
        <div className="reservation-table-header">
          <div>
            <h3>
              Customer Reservations
            </h3>

            <p>
              Reservations submitted to your
              pharmacy.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="reservation-state">
            <p>
              Loading reservations…
            </p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="reservation-state">
            <h3>
              No reservations yet
            </h3>

            <p>
              Customer reservations will appear
              here when they are submitted.
            </p>
          </div>
        ) : (
          <div className="reservation-table-scroll">
            <table className="reservation-table">
              <thead>
                <tr>
                  <th>Reservation</th>
                  <th>Customer</th>
                  <th>Pickup</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {reservations.map(
                  (reservation) => {
                    const items =
                      getItems(reservation)

                    const isUpdating =
                      updatingReservationId ===
                      reservation.reservation_id

                    return (
                      <tr
                        key={
                          reservation.reservation_id
                        }
                      >
                        {/* Reservation */}

                        <td>
                          <strong>
                            #
                            {
                              reservation.reservation_id
                            }
                          </strong>

                          <span className="reservation-subtext">
                            {formatDate(
                              reservation.reservation_date,
                            )}
                          </span>
                        </td>

                        {/* Customer */}

                        <td>
                          <strong>
                            {getCustomerName(
                              reservation,
                            )}
                          </strong>

                          {getCustomerEmail(
                            reservation,
                          ) && (
                            <span className="reservation-subtext">
                              {getCustomerEmail(
                                reservation,
                              )}
                            </span>
                          )}
                        </td>

                        {/* Pickup */}

                        <td>
                          <strong>
                            {formatDate(
                              reservation.pickup_date,
                            )}
                          </strong>

                          <span className="reservation-subtext">
                            {formatTime(
                              reservation.pickup_time,
                            )}
                          </span>
                        </td>

                        {/* Items */}

                        <td>
                          {items.length}{' '}
                          {items.length === 1
                            ? 'item'
                            : 'items'}
                        </td>

                        {/* Status */}

                        <td>
                          <span
                            className={getStatusClass(
                              reservation.status,
                            )}
                          >
                            {formatStatus(
                              reservation.status,
                            )}
                          </span>
                        </td>

                        {/* Actions */}

                        <td className="table-actions">
                          <button
                            type="button"
                            onClick={() =>
                              openReservationDetails(
                                reservation,
                              )
                            }
                          >
                            View Details
                          </button>

                          {reservation.status ===
                            'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirm(
                                    reservation.reservation_id,
                                  )
                                }
                                disabled={isUpdating}
                              >
                                {isUpdating
                                  ? 'Updating…'
                                  : 'Confirm'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCancel(
                                    reservation.reservation_id,
                                  )
                                }
                                disabled={isUpdating}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {reservation.status ===
                            'CONFIRMED' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleComplete(
                                    reservation.reservation_id,
                                  )
                                }
                                disabled={isUpdating}
                              >
                                {isUpdating
                                  ? 'Updating…'
                                  : 'Complete'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCancel(
                                    reservation.reservation_id,
                                  )
                                }
                                disabled={isUpdating}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {reservation.status ===
                            'COMPLETED' && (
                            <span className="reservation-action-complete">
                              Completed
                            </span>
                          )}

                          {reservation.status ===
                            'CANCELLED' && (
                            <span className="reservation-action-cancelled">
                              Cancelled
                            </span>
                          )}
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

      {/* ==================================================
          RESERVATION DETAILS MODAL
          ================================================== */}

      {selectedReservation && (
        <div
          className="reservation-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeReservationDetails()
            }
          }}
        >
          <div
            className="reservation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-title"
          >
            {/* Modal Header */}

            <div className="reservation-modal-header">
              <div>
                <span className="eyebrow">
                  Reservation Details
                </span>

                <h3 id="reservation-modal-title">
                  Reservation #
                  {
                    selectedReservation.reservation_id
                  }
                </h3>
              </div>

              <button
                type="button"
                className="reservation-modal-close"
                onClick={
                  closeReservationDetails
                }
                aria-label="Close reservation details"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}

            <div className="reservation-modal-body">
              {/* Status */}

              <div className="reservation-detail-status">
                <span>Status</span>

                <span
                  className={getStatusClass(
                    selectedReservation.status,
                  )}
                >
                  {formatStatus(
                    selectedReservation.status,
                  )}
                </span>
              </div>

              {/* Customer Information */}

              <div className="reservation-detail-section">
                <h4>
                  Customer Information
                </h4>

                <div className="reservation-detail-grid">
                  <div>
                    <span className="reservation-detail-label">
                      Name
                    </span>

                    <strong>
                      {getCustomerName(
                        selectedReservation,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Email
                    </span>

                    <strong>
                      {getCustomerEmail(
                        selectedReservation,
                      ) || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Phone
                    </span>

                    <strong>
                      {getCustomerPhone(
                        selectedReservation,
                      ) || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Customer ID
                    </span>

                    <strong>
                      #
                      {
                        selectedReservation.customer_id
                      }
                    </strong>
                  </div>
                </div>
              </div>

              {/* Pickup Information */}

              <div className="reservation-detail-section">
                <h4>
                  Pickup Information
                </h4>

                <div className="reservation-detail-grid">
                  <div>
                    <span className="reservation-detail-label">
                      Reservation Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedReservation.reservation_date,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Pickup Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedReservation.pickup_date,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Pickup Time
                    </span>

                    <strong>
                      {formatTime(
                        selectedReservation.pickup_time,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="reservation-detail-label">
                      Pharmacy ID
                    </span>

                    <strong>
                      #
                      {
                        selectedReservation.pharmacy_id
                      }
                    </strong>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}

              <div className="reservation-detail-section">
                <h4>
                  Customer Notes
                </h4>

                <p className="reservation-notes">
                  {selectedReservation.notes ||
                    'No notes provided.'}
                </p>
              </div>

              {/* Medicines */}

              <div className="reservation-detail-section">
                <div className="reservation-detail-section-heading">
                  <h4>
                    Reserved Medicines
                  </h4>

                  <span>
                    {getItems(
                      selectedReservation,
                    ).length}{' '}
                    {getItems(
                      selectedReservation,
                    ).length === 1
                      ? 'item'
                      : 'items'}
                  </span>
                </div>

                {getItems(
                  selectedReservation,
                ).length === 0 ? (
                  <p className="reservation-notes">
                    No medicine items found.
                  </p>
                ) : (
                  <div className="reservation-items-list">
                    {getItems(
                      selectedReservation,
                    ).map((item) => (
                      <div
                        className="reservation-item"
                        key={
                          item.reservation_item_id
                        }
                      >
                        <div className="reservation-item-info">
                          <strong>
                            {getMedicineName(
                              item,
                            )}
                          </strong>

                          <span>
                            {getMedicineDescription(
                              item,
                            )}
                          </span>

                          {item.medicines
                            ?.requires_prescription && (
                            <small>
                              Prescription Required
                            </small>
                          )}
                        </div>

                        <div className="reservation-item-quantity">
                          <span>
                            Quantity
                          </span>

                          <strong>
                            {item.quantity}
                          </strong>
                        </div>

                        <div className="reservation-item-price">
                          <span>
                            Unit Price
                          </span>

                          <strong>
                            ₱
                            {formatCurrency(
                              item.unit_price,
                            )}
                          </strong>
                        </div>

                        <div className="reservation-item-total">
                          <span>
                            Total
                          </span>

                          <strong>
                            ₱
                            {formatCurrency(
                              calculateItemTotal(
                                item,
                              ),
                            )}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reservation Total */}

              <div className="reservation-detail-total">
                <span>
                  Estimated Reservation Total
                </span>

                <strong>
                  ₱
                  {formatCurrency(
                    calculateReservationTotal(
                      selectedReservation,
                    ),
                  )}
                </strong>
              </div>
            </div>

            {/* Modal Footer */}

            <div className="reservation-modal-footer">
              <button
                type="button"
                onClick={
                  closeReservationDetails
                }
              >
                Close
              </button>

              {selectedReservation.status ===
                'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleConfirm(
                        selectedReservation.reservation_id,
                      )
                    }
                    disabled={
                      updatingReservationId ===
                      selectedReservation.reservation_id
                    }
                  >
                    {updatingReservationId ===
                    selectedReservation.reservation_id
                      ? 'Updating…'
                      : 'Confirm Reservation'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCancel(
                        selectedReservation.reservation_id,
                      )
                    }
                    disabled={
                      updatingReservationId ===
                      selectedReservation.reservation_id
                    }
                  >
                    Cancel Reservation
                  </button>
                </>
              )}

              {selectedReservation.status ===
                'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleComplete(
                        selectedReservation.reservation_id,
                      )
                    }
                    disabled={
                      updatingReservationId ===
                      selectedReservation.reservation_id
                    }
                  >
                    {updatingReservationId ===
                    selectedReservation.reservation_id
                      ? 'Updating…'
                      : 'Mark as Completed'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCancel(
                        selectedReservation.reservation_id,
                      )
                    }
                    disabled={
                      updatingReservationId ===
                      selectedReservation.reservation_id
                    }
                  >
                    Cancel Reservation
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

export default ReservationsPage