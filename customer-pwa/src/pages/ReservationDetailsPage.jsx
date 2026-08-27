import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Pill,
  RefreshCw,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function ReservationDetailsPage() {
  const navigate = useNavigate()
  const { reservationId } = useParams()

  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReservation = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await apiRequest(
        `/reservations/${reservationId}`,
        {
          method: 'GET',
        }
      )

      if (!response.success) {
        throw new Error(
          response.message ||
            'Failed to load reservation.'
        )
      }

      setReservation(response.data || null)
    } catch (error) {
      console.error(
        'Load reservation details error:',
        error
      )

      setReservation(null)

      setError(
        error.message ||
          'Failed to load reservation details.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservation()
  }, [reservationId])

  const getStatusClasses = (status) => {
    switch (status) {
      case 'PENDING':
        return 'border-amber-200 bg-amber-50 text-amber-700'

      case 'CONFIRMED':
        return 'border-blue-200 bg-blue-50 text-blue-700'

      case 'READY':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'

      case 'COMPLETED':
        return 'border-slate-200 bg-slate-100 text-slate-700'

      case 'CANCELLED':
        return 'border-red-200 bg-red-50 text-red-700'

      default:
        return 'border-slate-200 bg-slate-50 text-slate-600'
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

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Not available'

    return new Date(dateTime).toLocaleString(
      'en-PH',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
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

  const calculateTotal = () => {
    if (!reservation?.reservation_items) {
      return 0
    }

    return reservation.reservation_items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0

        const unitPrice =
          Number(item.unit_price) || 0

        return total + quantity * unitPrice
      },
      0
    )
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <div className="animate-pulse">
          <div className="h-4 w-20 rounded bg-slate-200" />

          <div className="mt-5 h-7 w-52 rounded bg-slate-200" />

          <div className="mt-2 h-4 w-72 rounded bg-slate-100" />

          <div className="mt-6 h-40 rounded-2xl bg-slate-100" />

          <div className="mt-4 h-48 rounded-2xl bg-slate-100" />
        </div>
      </section>
    )
  }

  if (error || !reservation) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() =>
            navigate('/my-reservations')
          }
          className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          My Reservations
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Pill size={24} />
          </div>

          <h1 className="mt-4 text-base font-extrabold text-slate-800">
            Unable to load reservation
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-red-600">
            {error || 'Reservation not found.'}
          </p>

          <button
            type="button"
            onClick={loadReservation}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-red-700"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </section>
    )
  }

  const totalPrice = calculateTotal()

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Back */}
      <button
        type="button"
        onClick={() =>
          navigate('/my-reservations')
        }
        className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
      >
        <ArrowLeft size={16} />
        My Reservations
      </button>

      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-emerald-700">
          Reservation Details
        </p>

        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Reservation #
              {reservation.reservation_id}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Submitted{' '}
              {formatDateTime(
                reservation.created_at
              )}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${getStatusClasses(
              reservation.status
            )}`}
          >
            {formatStatus(reservation.status)}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              Reservation submitted
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Your reservation is currently{' '}
              <strong>
                {formatStatus(
                  reservation.status
                )}
              </strong>
              . The pharmacy will process your
              reservation before pickup.
            </p>
          </div>
        </div>
      </div>

      {/* Pharmacy */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <MapPin size={19} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Pickup pharmacy
            </p>

            <h2 className="mt-1 text-sm font-extrabold text-slate-800">
              {reservation.pharmacies?.name ||
                'Pharmacy unavailable'}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {reservation.pharmacies?.address ||
                'Address unavailable'}
            </p>
          </div>
        </div>
      </div>

      {/* Pickup information */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-800">
          Pickup information
        </h2>

        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <CalendarDays
              size={18}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Pickup date
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {formatDate(
                  reservation.pickup_date
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock3
              size={18}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Pickup time
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {formatTime(
                  reservation.pickup_time
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Medicines */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Pill
            size={18}
            className="text-emerald-700"
          />

          <h2 className="text-sm font-extrabold text-slate-800">
            Reserved medicines
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {reservation.reservation_items?.map(
            (item) => {
              const itemTotal =
                Number(item.quantity || 0) *
                Number(item.unit_price || 0)

              return (
                <div
                  key={item.reservation_item_id}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800">
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
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Qty
                      </p>

                      <p className="mt-1 text-sm font-extrabold text-slate-800">
                        {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs text-slate-500">
                      ₱
                      {Number(
                        item.unit_price || 0
                      ).toFixed(2)}{' '}
                      × {item.quantity}
                    </span>

                    <span className="text-sm font-extrabold text-slate-800">
                      ₱{itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            }
          )}
        </div>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm font-bold text-slate-600">
            Estimated total
          </span>

          <span className="text-lg font-extrabold text-emerald-700">
            ₱{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {reservation.notes && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">
            Notes
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {reservation.notes}
          </p>
        </div>
      )}

      {/* Confirmation information */}
      {reservation.confirmed_at && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-extrabold text-blue-800">
            Reservation confirmed
          </p>

          <p className="mt-1 text-xs text-blue-700">
            Confirmed on{' '}
            {formatDateTime(
              reservation.confirmed_at
            )}
          </p>
        </div>
      )}

      {/* Completed information */}
      {reservation.completed_at && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-extrabold text-slate-800">
            Reservation completed
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Completed on{' '}
            {formatDateTime(
              reservation.completed_at
            )}
          </p>
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={() =>
          navigate('/my-reservations')
        }
        className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
      >
        Back to My Reservations
      </button>
    </section>
  )
}

export default ReservationDetailsPage