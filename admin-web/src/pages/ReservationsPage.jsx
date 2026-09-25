import { useEffect, useMemo, useState } from 'react'
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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

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

  const handleComplete = async (reservationId) => {
    const paymentMethod = window.prompt(
      'Payment method? (CASH, CARD, GCASH, MAYA, BANK_TRANSFER, OTHER)',
      'CASH',
    )

    if (!paymentMethod) return

    try {
      setUpdatingReservationId(reservationId)
      setError('')
      setSuccessMessage('')

      const response = await apiRequest(
        `/reservations/${reservationId}/complete`,
        {
          method: 'POST',
          token: accessToken,
          body: {
            payment_method: paymentMethod.trim().toUpperCase(),
          },
        },
      )

      const refreshed = await apiRequest('/reservations/pharmacy', {
        token: accessToken,
      })
      setReservations(refreshed.data || [])

      setSuccessMessage(
        `Sale #${response.data.sale_id} recorded — ₱${Number(
          response.data.total_amount,
        ).toFixed(2)}`,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Failed to complete reservation',
      )
    } finally {
      setUpdatingReservationId(null)
    }
  }

  const handleExpire = async (reservationId) => {
    const confirmed = window.confirm(
      'Mark this reservation as EXPIRED (no-show)? Stock will be restored to inventory.',
    )

    if (!confirmed) return

    try {
      setUpdatingReservationId(reservationId)
      setError('')
      setSuccessMessage('')

      await apiRequest(`/reservations/${reservationId}/no-show`, {
        method: 'POST',
        token: accessToken,
      })

      const refreshed = await apiRequest('/reservations/pharmacy', {
        token: accessToken,
      })
      setReservations(refreshed.data || [])

      setSuccessMessage(
        'Reservation expired. Stock restored to inventory.',
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Failed to mark reservation as expired',
      )
    } finally {
      setUpdatingReservationId(null)
    }
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
  // Filtering and search
  // --------------------------------------------------

  const filteredReservations = useMemo(() => {
    let filtered = [...reservations]

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((reservation) => {
        const id = reservation.reservation_id.toString()
        const customerName = getCustomerName(reservation).toLowerCase()
        const customerEmail = getCustomerEmail(reservation).toLowerCase()
        const status = formatStatus(reservation.status).toLowerCase()

        return (
          id.includes(term) ||
          customerName.includes(term) ||
          customerEmail.includes(term) ||
          status.includes(term)
        )
      })
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(
        (reservation) => reservation.status === statusFilter
      )
    }

    // Apply date filter
    if (dateFilter !== 'ALL') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      filtered = filtered.filter((reservation) => {
        const pickupDate = new Date(reservation.pickup_date)
        pickupDate.setHours(0, 0, 0, 0)

        switch (dateFilter) {
          case 'TODAY':
            return pickupDate.getTime() === today.getTime()
          case 'UPCOMING':
            return pickupDate >= today
          case 'PAST':
            return pickupDate < today
          default:
            return true
        }
      })
    }

    // Sort by pickup date (upcoming first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.pickup_date)
      const dateB = new Date(b.pickup_date)
      return dateB - dateA
    })

    return filtered
  }, [reservations, searchTerm, statusFilter, dateFilter])

  // --------------------------------------------------
  // Pagination
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const paginatedReservations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredReservations.slice(startIndex, endIndex)
  }, [filteredReservations, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
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

        {/* Search and Filters */}
        <div className="reservation-filters">
          <div className="reservation-search">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by ID, customer name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="reservation-filter-group">
            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </label>

            <label>
              <span>Pickup Date</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="PAST">Past</option>
              </select>
            </label>

            {(searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL') && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setDateFilter('ALL')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        {!isLoading && (
          <div className="reservation-results-info">
            <span>
              Showing {paginatedReservations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredReservations.length)} of{' '}
              {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''}
            </span>
            {(searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL') && (
              <span className="filtered-indicator">
                (filtered from {reservations.length} total)
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="reservation-state">
            <p>
              Loading reservations…
            </p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="reservation-state">
            <h3>
              {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                ? 'No matching reservations'
                : 'No reservations yet'}
            </h3>

            <p>
              {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Customer reservations will appear here when they are submitted.'}
            </p>
          </div>
        ) : (
          <>
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
                  {paginatedReservations.map(
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

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleExpire(
                                      reservation.reservation_id,
                                    )
                                  }
                                  disabled={isUpdating}
                                >
                                  {isUpdating
                                    ? 'Updating…'
                                    : 'No-Show'}
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

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleExpire(
                                      reservation.reservation_id,
                                    )
                                  }
                                  disabled={isUpdating}
                                >
                                  {isUpdating
                                    ? 'Updating…'
                                    : 'No-Show'}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="reservation-pagination">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsis = index > 0 && page - array[index - 1] > 1

                      return (
                        <span key={page}>
                          {showEllipsis && <span className="pagination-ellipsis">...</span>}
                          <button
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`pagination-page ${
                              currentPage === page ? 'active' : ''
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      )
                    })}
                </div>

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                  aria-label="Next page"
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
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

                  <button
                    type="button"
                    onClick={() =>
                      handleExpire(
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
                      : 'No-Show'}
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

                  <button
                    type="button"
                    onClick={() =>
                      handleExpire(
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
                      : 'No-Show'}
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