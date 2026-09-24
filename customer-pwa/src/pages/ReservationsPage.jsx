import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Minus,
  Pill,
  Plus,
  ShoppingBag,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function getLocalDateString() {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isValidDateString(value) {
  if (!value) {
    return false
  }

  const date = new Date(`${value}T00:00:00`)

  return !Number.isNaN(date.getTime())
}

function ReservationsPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const reservationData = location.state

  const medicine = reservationData?.medicine
  const pharmacy = reservationData?.pharmacy
  const inventory = reservationData?.inventory

  const [quantity, setQuantity] = useState(1)
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdReservation, setCreatedReservation] =
    useState(null)

  /*
   * Redirect if the page was opened directly
   * without selecting a medicine, pharmacy, and inventory.
   */
  useEffect(() => {
    if (!medicine || !pharmacy || !inventory) {
      navigate('/search', { replace: true })
    }
  }, [medicine, pharmacy, inventory, navigate])

  /*
   * The inventory quantity is only used for the UI.
   *
   * The backend remains the final authority for stock
   * availability because inventory can change after this
   * page was opened.
   */
  const availableStock = useMemo(() => {
    const stock = Number(inventory?.quantity)

    return Number.isFinite(stock) && stock > 0
      ? Math.floor(stock)
      : 0
  }, [inventory])

  const unitPrice = useMemo(() => {
    const price = Number(inventory?.unit_price)

    return Number.isFinite(price) && price >= 0
      ? price
      : 0
  }, [inventory])

  const totalPrice = unitPrice * quantity

  /*
   * Use the browser's local date instead of toISOString().
   *
   * toISOString() converts the date to UTC, which can cause
   * the minimum pickup date to become incorrect depending
   * on the customer's timezone.
   */
  const today = getLocalDateString()

  /*
   * Increase quantity.
   */
  const increaseQuantity = () => {
    setError('')

    setQuantity((current) => {
      if (current >= availableStock) {
        return current
      }

      return current + 1
    })
  }

  /*
   * Decrease quantity.
   */
  const decreaseQuantity = () => {
    setError('')

    setQuantity((current) => {
      if (current <= 1) {
        return 1
      }

      return current - 1
    })
  }

  /*
   * Handle pickup date changes.
   */
  const handlePickupDateChange = (event) => {
    setError('')
    setPickupDate(event.target.value)
  }

  /*
   * Handle pickup time changes.
   */
  const handlePickupTimeChange = (event) => {
    setError('')
    setPickupTime(event.target.value)
  }

  /*
   * Submit reservation.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()

    /*
     * Prevent duplicate submissions.
     */
    if (submitting) {
      return
    }

    setError('')

    /*
     * Validate reservation source data.
     */
    if (!medicine || !pharmacy || !inventory) {
      setError('Reservation information is incomplete.')
      return
    }

    /*
     * Validate pharmacy ID.
     */
    const pharmacyId = Number(pharmacy.pharmacy_id)

    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0) {
      setError('The selected pharmacy is invalid.')
      return
    }

    /*
     * Validate medicine ID.
     */
    const medicineId = Number(medicine.medicine_id)

    if (!Number.isInteger(medicineId) || medicineId <= 0) {
      setError('The selected medicine is invalid.')
      return
    }

    /*
     * Validate quantity.
     */
    const requestedQuantity = Number(quantity)

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      setError('Quantity must be at least 1.')
      return
    }

    /*
     * This is only a client-side check.
     * The backend performs the authoritative stock check.
     */
    if (requestedQuantity > availableStock) {
      setError(
        'The requested quantity is greater than the available stock.',
      )
      return
    }

    /*
     * Validate pickup date.
     */
    if (!pickupDate) {
      setError('Please select a pickup date.')
      return
    }

    if (!isValidDateString(pickupDate)) {
      setError('Please select a valid pickup date.')
      return
    }

    if (pickupDate < today) {
      setError('Pickup date cannot be in the past.')
      return
    }

    /*
     * Validate pickup time.
     */
    if (!pickupTime) {
      setError('Please select a pickup time.')
      return
    }

    /*
     * HTML time input returns HH:mm.
     * Keep it in this format because the backend accepts
     * the pickup time separately from the pickup date.
     */
    const normalizedPickupTime = pickupTime.trim()

    if (!/^\d{2}:\d{2}$/.test(normalizedPickupTime)) {
      setError('Please select a valid pickup time.')
      return
    }

    /*
     * Validate notes length before sending.
     */
    const trimmedNotes = notes.trim()

    if (trimmedNotes.length > 500) {
      setError('Notes cannot exceed 500 characters.')
      return
    }

    try {
      setSubmitting(true)

      /*
       * IMPORTANT:
       *
       * Do not send customer_id.
       *
       * The backend obtains the authenticated customer
       * from req.pharmaUser after:
       *
       * authenticateUser
       * -> loadPharmaUser
       * -> requireRole('CUSTOMER')
       *
       * Also do not send inventory_id or batch_number.
       * The backend is responsible for resolving and
       * reserving the appropriate inventory stock.
       */
      const response = await apiRequest('/reservations', {
        method: 'POST',
        body: {
          pharmacy_id: pharmacyId,

          pickup_date: pickupDate,

          pickup_time: normalizedPickupTime,

          notes: trimmedNotes || null,

          items: [
            {
              medicine_id: medicineId,
              quantity: requestedQuantity,
            },
          ],
        },
      })

      if (!response?.success) {
        throw new Error(
          response?.message ||
            'Failed to create reservation.',
        )
      }

      /*
       * Backend response:
       *
       * {
       *   success: true,
       *   message: 'Reservation created successfully',
       *   data: {
       *     reservation,
       *     items,
       *     pharmacy
       *   }
       * }
       */
      const reservation =
        response?.data?.reservation || null

      setCreatedReservation(reservation)
      setSuccess(true)
    } catch (error) {
      console.error(
        'Create reservation error:',
        error,
      )

      /*
       * apiRequest() converts non-2xx responses into
       * an Error using payload.message.
       *
       * Therefore this message can safely be shown to
       * the customer.
       */
      setError(
        error?.message ||
          'Failed to create reservation. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  /*
   * Reservation successfully created.
   */
  if (success) {
    return (
      <section className="create-reservation-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <div className="reservation-success-card rounded-2xl p-6 text-center">
          <div className="reservation-success-icon mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle2 size={34} />
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-[var(--text-primary)]">
            Reservation submitted
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Your medicine has been reserved
            successfully.
          </p>

          {createdReservation?.reservation_id && (
            <p className="mt-3 text-xs font-bold text-[var(--primary)]">
              Reservation #
              {createdReservation.reservation_id}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-[var(--success-border)] bg-[var(--surface)] p-4 text-left">
            <div className="flex items-start gap-3">
              <Pill
                size={20}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
              />

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                  {medicine?.generic_name}
                </p>

                {medicine?.brand_name && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {medicine.brand_name}
                  </p>
                )}

                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Quantity: {quantity}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--border-light)] pt-4">
              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {pharmacy?.name}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {pharmacy?.address ||
                      'Address unavailable'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--border-light)] pt-4">
              <div className="flex items-start gap-3">
                <CalendarDays
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    Pickup date
                  </p>

                  <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                    {pickupDate}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3">
                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    Pickup time
                  </p>

                  <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                    {pickupTime}
                  </p>
                </div>
              </div>
            </div>

            {createdReservation?.status && (
              <div className="mt-4 border-t border-[var(--border-light)] pt-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Reservation status
                </p>

                <p className="mt-1 text-sm font-extrabold text-[var(--primary)]">
                  {createdReservation.status}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[var(--primary-hover)]"
          >
            Back to Home
          </button>
        </div>
      </section>
    )
  }

  /*
   * Safety fallback while redirecting.
   */
  if (!medicine || !pharmacy || !inventory) {
    return null
  }

  return (
    <section className="create-reservation-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        disabled={submitting}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Page heading */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-[var(--primary)]">
          Reservation
        </p>

        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
          Reserve for pickup
        </h1>

        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          Choose how many you need and when you want
          to pick them up.
        </p>
      </div>

      {/* Medicine summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
            <Pill size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
              {medicine.generic_name}
            </h2>

            {medicine.brand_name && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {medicine.brand_name}
              </p>
            )}

            <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">
              {medicine.dosage} •{' '}
              {medicine.dosage_form}
            </p>
          </div>
        </div>

        {medicine.requires_prescription && (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-bold text-amber-700">
              Prescription required
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
              You may need to present a valid
              prescription when picking up this
              medicine.
            </p>
          </div>
        )}
      </div>

      {/* Pharmacy */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--text-secondary)]">
            <MapPin size={19} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Pickup pharmacy
            </p>

            <h2 className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">
              {pharmacy.name}
            </h2>

            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {pharmacy.address ||
                'Address unavailable'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Price per unit
            </p>

            <p className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">
              ₱{unitPrice.toFixed(2)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Available
            </p>

            <p className="mt-1 text-sm font-extrabold text-[var(--primary)]">
              {availableStock} units
            </p>
          </div>
        </div>
      </div>

      {/* Reservation form */}
      <form
        onSubmit={handleSubmit}
        className="mt-4"
      >
        {/* Quantity */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                Quantity
              </h2>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Select the number of units.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={
                  quantity <= 1 || submitting
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:border-[var(--primary-muted)] hover:text-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>

              <span className="min-w-8 text-center text-base font-extrabold text-[var(--text-primary)]">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  quantity >= availableStock ||
                  submitting
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:border-[var(--primary-muted)] hover:text-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-soft)] px-3 py-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Estimated total
            </span>

            <span className="text-sm font-extrabold text-[var(--text-primary)]">
              ₱{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pickup date */}
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <label
            htmlFor="pickup-date"
            className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]"
          >
            <CalendarDays
              size={17}
              className="text-[var(--primary)]"
            />
            Pickup date
          </label>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Choose the date you want to collect your
            reservation.
          </p>

          <input
            id="pickup-date"
            type="date"
            min={today}
            value={pickupDate}
            onChange={handlePickupDateChange}
            disabled={submitting}
            className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]"
            required
          />
        </div>

        {/* Pickup time */}
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <label
            htmlFor="pickup-time"
            className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]"
          >
            <Clock3
              size={17}
              className="text-[var(--primary)]"
            />
            Pickup time
          </label>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Select your preferred pickup time.
          </p>

          <input
            id="pickup-time"
            type="time"
            value={pickupTime}
            onChange={handlePickupTimeChange}
            disabled={submitting}
            className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]"
            required
          />
        </div>

        {/* Notes */}
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <label
            htmlFor="notes"
            className="text-sm font-extrabold text-[var(--text-primary)]"
          >
            Notes
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
              (optional)
            </span>
          </label>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Add any additional information for the
            pharmacy.
          </p>

          <textarea
            id="notes"
            value={notes}
            onChange={(event) => {
              setError('')
              setNotes(event.target.value)
            }}
            rows={4}
            maxLength={500}
            disabled={submitting}
            placeholder="Example: I will pick this up after work."
            className="mt-4 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]"
          />

          <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
            {notes.length}/500
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold leading-relaxed text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="reservation-confirm-card">
          <div className="reservation-confirm-header">
            <div className="reservation-confirm-icon">
              <ShoppingBag size={17} />
            </div>

            <div className="reservation-confirm-copy">
              <h3>Confirm reservation</h3>

              <p>
                Reserve {quantity}{' '}
                {quantity === 1
                  ? 'unit'
                  : 'units'}{' '}
                at {pharmacy.name}.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              availableStock <= 0
            }
            className="reservation-confirm-button"
          >
            {submitting ? (
              'Submitting reservation...'
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Confirm reservation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ReservationsPage