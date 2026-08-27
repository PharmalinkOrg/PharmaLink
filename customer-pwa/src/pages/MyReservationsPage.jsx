import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
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
      console.error(
        'Load reservations error:',
        error
      )

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
        return 'bg-amber-50 text-amber-700 border-amber-200'

      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border-blue-200'

      case 'READY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'

      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200'

      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200'

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'

    return status
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  }

  const formatDate = (date) => {
    if (!date) return 'Not available'

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      'en-PH',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    )
  }

  const formatTime = (time) => {
    if (!time) return 'Not available'

    const [hours, minutes] = time.split(':')

    const date = new Date()

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    )

    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <p className="text-xs font-semibold text-emerald-700">
            Reservations
          </p>

          <h1 className="mt-1 text-2xl font-extrabold text-slate-800">
            My Reservations
          </h1>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            View and track your medicine pickup
            reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReservations}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-32 rounded bg-slate-200" />

              <div className="mt-4 h-5 w-48 rounded bg-slate-200" />

              <div className="mt-3 h-4 w-full rounded bg-slate-100" />

              <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
            </div>
          ))}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Pill size={24} />
            </div>

            <h2 className="mt-4 text-base font-extrabold text-slate-800">
              No reservations yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
              You haven't made any medicine pickup
              reservations yet.
            </p>

            <button
              type="button"
              onClick={() => navigate('/search')}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700"
            >
              Find a medicine
            </button>
          </div>
        )}

      {/* Reservation list */}
      {!loading &&
        !error &&
        reservations.length > 0 && (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <article
                    key={reservation.reservation_id}
                    onClick={() =>
                        navigate(
                        `/my-reservations/${reservation.reservation_id}`
                        )
                    }
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                    >

                {/* Reservation header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Reservation
                    </p>

                    <h2 className="mt-1 text-sm font-extrabold text-slate-800">
                      #{reservation.reservation_id}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusClasses(
                      reservation.status
                    )}`}
                  >
                    {formatStatus(
                      reservation.status
                    )}
                  </span>
                </div>

                {/* Pharmacy */}
                <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-4">
                  <MapPin
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400">
                      Pickup pharmacy
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-slate-800">
                      {reservation.pharmacies?.name ||
                        'Pharmacy unavailable'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {reservation.pharmacies?.address ||
                        'Address unavailable'}
                    </p>
                  </div>
                </div>

                {/* Medicines */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Pill
                      size={17}
                      className="text-emerald-700"
                    />

                    <p className="text-xs font-extrabold text-slate-800">
                      Reserved medicine
                    </p>
                  </div>

                  {reservation.reservation_items
                    ?.length > 0 ? (
                    <div className="space-y-3">
                      {reservation.reservation_items.map(
                        (item) => (
                          <div
                            key={
                              item.reservation_item_id
                            }
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">
                                  {item.medicines
                                    ?.generic_name ||
                                    'Medicine unavailable'}
                                </p>

                                {item.medicines
                                  ?.brand_name && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      item.medicines
                                        .brand_name
                                    }
                                  </p>
                                )}

                                <p className="mt-1 text-[11px] text-slate-500">
                                  {item.medicines
                                    ?.dosage || ''}
                                  {' • '}
                                  {item.medicines
                                    ?.dosage_form || ''}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-xs font-bold text-slate-500">
                                  Qty
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-slate-800">
                                  {item.quantity}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 border-t border-slate-200 pt-2">
                              <p className="text-right text-xs font-bold text-slate-600">
                                ₱
                                {Number(
                                  item.unit_price || 0
                                ).toFixed(2)}{' '}
                                / unit
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No medicine items recorded.
                    </p>
                  )}
                </div>

                {/* Pickup */}
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <CalendarDays
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Pickup date
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {formatDate(
                          reservation.pickup_date
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock3
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Pickup time
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {formatTime(
                          reservation.pickup_time
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {reservation.notes && (
                  <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Notes
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {reservation.notes}
                    </p>
                  </div>
                )}

              </article>
            ))}
          </div>
        )}
    </section>
  )
}

export default MyReservationsPage