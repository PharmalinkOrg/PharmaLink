import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

function ReservationsPage() {
  const { accessToken } = useAuth()

  const [reservations, setReservations] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

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
          setError(requestError.message)
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

  const getStatusClass = (status) => {
    return `reservation-status ${status?.toLowerCase().replaceAll('_', '-') || 'unknown'}`
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'

    return status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase())
  }

  const formatDate = (date) => {
    if (!date) return '—'

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    )
  }

  const formatTime = (time) => {
    if (!time) return '—'

    const [hours, minutes] = time.split(':')

    if (hours === undefined || minutes === undefined) {
      return time
    }

    const date = new Date()
    date.setHours(Number(hours), Number(minutes), 0, 0)

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getCustomerName = (reservation) => {
    const customer = reservation.users || reservation.customer

    if (!customer) {
      return `Customer #${reservation.customer_id}`
    }

    return (
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
      `Customer #${reservation.customer_id}`
    )
  }

  const getItems = (reservation) => {
    return reservation.reservation_items || reservation.items || []
  }

  const totalReservations = reservations.length

  const pendingReservations = reservations.filter(
    (reservation) => reservation.status === 'PENDING',
  ).length

  const confirmedReservations = reservations.filter(
    (reservation) => reservation.status === 'CONFIRMED',
  ).length

  const completedReservations = reservations.filter(
    (reservation) => reservation.status === 'COMPLETED',
  ).length

  return (
    <section className="reservations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pharmacy Operations</span>
          <h2 className="page-title">Reservations</h2>
          <p className="page-copy">
            Manage customer pickup reservations for your pharmacy.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

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

      <div className="reservation-table-wrap">
        <div className="reservation-table-header">
          <div>
            <h3>Customer Reservations</h3>
            <p>Reservations submitted to your pharmacy.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="reservation-state">
            <p>Loading reservations…</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="reservation-state">
            <h3>No reservations yet</h3>
            <p>
              Customer reservations will appear here when they are
              submitted.
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
                {reservations.map((reservation) => {
                  const items = getItems(reservation)

                  return (
                    <tr key={reservation.reservation_id}>
                      <td>
                        <strong>
                          #{reservation.reservation_id}
                        </strong>
                        <span className="reservation-subtext">
                          {formatDate(reservation.reservation_date)}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {getCustomerName(reservation)}
                        </strong>
                        {reservation.users?.email && (
                          <span className="reservation-subtext">
                            {reservation.users.email}
                          </span>
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatDate(reservation.pickup_date)}
                        </strong>
                        <span className="reservation-subtext">
                          {formatTime(reservation.pickup_time)}
                        </span>
                      </td>

                      <td>
                        {items.length}{' '}
                        {items.length === 1 ? 'item' : 'items'}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            reservation.status,
                          )}
                        >
                          {formatStatus(reservation.status)}
                        </span>
                      </td>

                      <td className="table-actions">
                        <button type="button">
                          View Details
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
    </section>
  )
}

export default ReservationsPage