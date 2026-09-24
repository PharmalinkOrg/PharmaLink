import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Pill,
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function MyReservationsPage() {
  const navigate = useNavigate()

  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReservations = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await apiRequest('/reservations', {
        method: 'GET',
      })

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to load reservations.'
        )
      }

      setReservations(response.data || [])
    } catch (error) {
      console.error('Load reservations error:', error)

      setError(
        error.message ||
          'Failed to load your reservations.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservations()
  }, [])

  const getStatusClasses = (status) => {
    switch (status) {
      case 'PENDING':
        return 'reservation-status-pending'

      case 'CONFIRMED':
        return 'reservation-status-confirmed'

      case 'READY':
      case 'READY_FOR_PICKUP':
        return 'reservation-status-ready'

      case 'COMPLETED':
        return 'reservation-status-completed'

      case 'CANCELLED':
      case 'EXPIRED':
        return 'reservation-status-cancelled'

      default:
        return 'reservation-status-neutral'
    }
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'

    return status
      .toLowerCase()
      .replace(/\_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  }

  const formatDate = (date) => {
    if (!date) return 'Not available'

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMedicineCount = (reservation) => {
    if (!reservation.reservation_items?.length) {
      return 0
    }

    return reservation.reservation_items.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    )
  }

  const handleReservationClick = (reservationId) => {
    navigate(
      `/my-reservations/${reservationId}`
    )
  }

  return (
    <section className="reservations-page mx-auto w-full max-w-5xl px-4 pb-28 pt-5">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
        
          <p className="text-xs font-semibold text-[var(--primary)]">
            Reservations
          </p>

          <h1 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
            My Reservations
          </h1>

          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            View and track your medicine pickup
            reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReservations}
          disabled={loading}
          className="reservation-refresh-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          aria-label="Refresh reservations"
        >
          <RefreshCw
            size={17}
            className={
              loading ? 'animate-spin' : ''
            }
          />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
            <div className="h-3 w-32 animate-pulse rounded bg-[var(--border)]" />
          </div>

          <div className="divide-y divide-[var(--border-light)]">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 px-4 py-4"
              >
                <div className="h-4 w-20 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-4 w-40 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-soft)]" />
                <div className="ml-auto h-6 w-20 animate-pulse rounded-full bg-[var(--surface-soft)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-bold text-red-700">
            Unable to load reservations
          </p>

          <p className="mt-1 text-xs leading-relaxed text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadReservations}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        reservations.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
              <Pill size={24} />
            </div>

            <h2 className="mt-4 text-base font-extrabold text-[var(--text-primary)]">
              No reservations yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
              You haven't made any medicine pickup
              reservations yet.
            </p>

            <button
              type="button"
              onClick={() => navigate('/search')}
              className="reservation-primary-button mt-5 rounded-xl px-5 py-3 text-xs font-extrabold"
            >
              Find a medicine
            </button>
          </div>
        )}

      {/* Reservation Table */}
      {!loading &&
        !error &&
        reservations.length > 0 && (
          <div className="reservation-table-wrapper">
            <div className="reservation-table-scroll">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Reservation</th>
                    <th>Pickup Pharmacy</th>
                    <th>Pickup Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th className="reservation-table-action">
                      <span className="sr-only">
                        View
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.reservation_id}
                      onClick={() =>
                        handleReservationClick(
                          reservation.reservation_id
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' ||
                          event.key === ' '
                        ) {
                          event.preventDefault()

                          handleReservationClick(
                            reservation.reservation_id
                          )
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View reservation ${reservation.reservation_id}`}
                    >
                      {/* Reservation ID */}
                      <td>
                        <div className="reservation-number">
                          #{reservation.reservation_id}
                        </div>

                        <div className="reservation-mobile-hint">
                          Tap to view details
                        </div>
                      </td>

                      {/* Pharmacy */}
                      <td>
                        <div className="reservation-pharmacy">
                          <div className="reservation-pharmacy-icon">
                            <MapPin size={16} />
                          </div>

                          <div className="reservation-pharmacy-info">
                            <span className="reservation-pharmacy-name">
                              {reservation.pharmacies
                                ?.name ||
                                'Pharmacy unavailable'}
                            </span>

                            <span className="reservation-pharmacy-address">
                              {reservation.pharmacies
                                ?.address ||
                                'Address unavailable'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pickup Date */}
                      <td>
                        <div className="reservation-date">
                          <CalendarDays size={16} />

                          <span>
                            {formatDate(
                              reservation.pickup_date
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td>
                        <div className="reservation-items">
                          <Pill size={16} />

                          <span>
                            {getMedicineCount(
                              reservation
                            )}{' '}
                            {getMedicineCount(
                              reservation
                            ) === 1
                              ? 'item'
                              : 'items'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`reservation-status ${getStatusClasses(
                            reservation.status
                          )}`}
                        >
                          {formatStatus(
                            reservation.status
                          )}
                        </span>
                      </td>

                      {/* View */}
                      <td className="reservation-table-action">
                        <ArrowRight
                          size={17}
                          className="reservation-view-icon"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reservation-table-footer">
              <span>
                {reservations.length}{' '}
                {reservations.length === 1
                  ? 'reservation'
                  : 'reservations'}
              </span>

              <span>
                Select a reservation to view details
              </span>
            </div>
          </div>
        )}
    </section>
  )
}

export default MyReservationsPage