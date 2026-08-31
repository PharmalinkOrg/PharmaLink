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
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={34} />
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-slate-800">
            Reservation submitted
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your medicine has been reserved
            successfully.
          </p>

          {createdReservation?.reservation_id && (
            <p className="mt-3 text-xs font-bold text-emerald-700">
              Reservation #
              {createdReservation.reservation_id}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4 text-left">
            <div className="flex items-start gap-3">
              <Pill
                size={20}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-800">
                  {medicine?.generic_name}
                </p>

                {medicine?.brand_name && (
                  <p className="mt-1 text-xs text-slate-500">
                    {medicine.brand_name}
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-500">
                  Quantity: {quantity}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {pharmacy?.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {pharmacy?.address ||
                      'Address unavailable'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <CalendarDays
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Pickup date
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {pickupDate}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3">
                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Pickup time
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {pickupTime}
                  </p>
                </div>
              </div>
            </div>

            {createdReservation?.status && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500">
                  Reservation status
                </p>

                <p className="mt-1 text-sm font-extrabold text-emerald-700">
                  {createdReservation.status}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700"
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
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        disabled={submitting}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Page heading */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-emerald-700">
          Reservation
        </p>

        <h1 className="mt-1 text-2xl font-extrabold text-slate-800">
          Reserve for pickup
        </h1>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Choose how many you need and when you want
          to pick them up.
        </p>
      </div>

      {/* Medicine summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Pill size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-slate-800">
              {medicine.generic_name}
            </h2>

            {medicine.brand_name && (
              <p className="mt-1 text-xs text-slate-500">
                {medicine.brand_name}
              </p>
            )}

            <p className="mt-1 text-xs font-semibold text-slate-600">
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
              {pharmacy.name}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {pharmacy.address ||
                'Address unavailable'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Price per unit
            </p>

            <p className="mt-1 text-sm font-extrabold text-slate-800">
              ₱{unitPrice.toFixed(2)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">
              Available
            </p>

            <p className="mt-1 text-sm font-extrabold text-emerald-700">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                Quantity
              </h2>

              <p className="mt-1 text-xs text-slate-500">
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>

              <span className="min-w-8 text-center text-base font-extrabold text-slate-800">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  quantity >= availableStock ||
                  submitting
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-xs font-semibold text-slate-500">
              Estimated total
            </span>

            <span className="text-sm font-extrabold text-slate-800">
              ₱{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pickup date */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="pickup-date"
            className="flex items-center gap-2 text-sm font-extrabold text-slate-800"
          >
            <CalendarDays
              size={17}
              className="text-emerald-700"
            />
            Pickup date
          </label>

          <p className="mt-1 text-xs text-slate-500">
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
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          />
        </div>

        {/* Pickup time */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="pickup-time"
            className="flex items-center gap-2 text-sm font-extrabold text-slate-800"
          >
            <Clock3
              size={17}
              className="text-emerald-700"
            />
            Pickup time
          </label>

          <p className="mt-1 text-xs text-slate-500">
            Select your preferred pickup time.
          </p>

          <input
            id="pickup-time"
            type="time"
            value={pickupTime}
            onChange={handlePickupTimeChange}
            disabled={submitting}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          />
        </div>

        {/* Notes */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="notes"
            className="text-sm font-extrabold text-slate-800"
          >
            Notes
            <span className="ml-1 text-xs font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <p className="mt-1 text-xs text-slate-500">
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
            className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          <p className="mt-1 text-right text-[10px] text-slate-400">
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
        <div className="mt-6 rounded-2xl bg-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-emerald-200">
              <ShoppingBag size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white">
                Confirm reservation
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-300">
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              'Submitting reservation...'
            ) : (
              <>
                <CheckCircle2 size={15} />
                Confirm reservation
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ReservationsPage