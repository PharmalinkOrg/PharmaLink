export default ReservationsPage
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
import { useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

// ============================================================
// RESERVATION BUSINESS RULES
// ============================================================

const PICKUP_START_TIME = '08:00'
const PICKUP_END_TIME = '20:00'

const PREPARATION_BUFFER_MINUTES = 30

// Minutes are offered only in 5-minute steps, but the
// business rules (rounding, cutoff) still use these values.
const PICKUP_INTERVAL_MINUTES = 5

// ============================================================
// DATE / TIME HELPERS
// ============================================================

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(
    minutes,
  ).padStart(2, '0')}`
}

function timeStringToMinutes(timeString) {
  if (!/^\d{2}:\d{2}$/.test(timeString)) {
    return null
  }

  const [hours, minutes] = timeString.split(':').map(Number)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

/**
 * Calculate the earliest valid pickup time.
 *
 * Rules:
 * - Same-day pickup only.
 * - Pickup cannot be before 8:00 AM.
 * - Pharmacy gets at least 30 minutes preparation time.
 * - Earliest pickup is rounded UP to a 5-minute interval.
 * - Pickup cannot be later than 8:00 PM.
 *
 * Returns:
 * "HH:mm" when a pickup time remains.
 * null when reservations are closed for today.
 */
function getEarliestPickupTime(now = new Date()) {
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes()

  const openingMinutes =
    timeStringToMinutes(PICKUP_START_TIME)

  const closingMinutes =
    timeStringToMinutes(PICKUP_END_TIME)

  let earliestMinutes =
    currentMinutes + PREPARATION_BUFFER_MINUTES

  /*
   * Example:
   *
   * Current time: 6:42 PM
   * + 30 minutes: 7:12 PM
   * Rounded upward: 7:15 PM
   */
  earliestMinutes =
    Math.ceil(
      earliestMinutes / PICKUP_INTERVAL_MINUTES,
    ) * PICKUP_INTERVAL_MINUTES

  /*
   * Before opening, the earliest possible pickup
   * remains 8:00 AM.
   */
  earliestMinutes = Math.max(
    earliestMinutes,
    openingMinutes,
  )

  /*
   * No valid same-day pickup remains.
   */
  if (earliestMinutes > closingMinutes) {
    return null
  }

  return minutesToTimeString(earliestMinutes)
}

function formatPickupDate(dateString) {
  if (!dateString) {
    return ''
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPickupTime(timeString) {
  if (!timeString) {
    return ''
  }

  const [hours, minutes] = timeString.split(':').map(Number)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return timeString
  }

  const date = new Date()

  date.setHours(hours, minutes, 0, 0)

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Validate a customer's selected pickup time.
 */
function isPickupTimeAllowed(
  timeString,
  earliestPickupTime,
) {
  const selectedMinutes =
    timeStringToMinutes(timeString)

  const openingMinutes =
    timeStringToMinutes(PICKUP_START_TIME)

  const closingMinutes =
    timeStringToMinutes(PICKUP_END_TIME)

  const earliestMinutes =
    earliestPickupTime
      ? timeStringToMinutes(earliestPickupTime)
      : null

  if (
    selectedMinutes === null ||
    earliestMinutes === null
  ) {
    return false
  }

  return (
    selectedMinutes >= openingMinutes &&
    selectedMinutes >= earliestMinutes &&
    selectedMinutes <= closingMinutes
  )
}

/**
 * Build the list of allowed pickup times between the
 * earliest valid time and the 8:00 PM cutoff.
 *
 * Times are spaced in 5-minute increments.
 */
function buildPickupTimeOptions(earliestPickupTime) {
  const earliestMinutes =
    timeStringToMinutes(earliestPickupTime)

  const closingMinutes =
    timeStringToMinutes(PICKUP_END_TIME)

  if (earliestMinutes === null) {
    return []
  }

  const options = []

  for (
    let minutes = earliestMinutes;
    minutes <= closingMinutes;
    minutes += PICKUP_INTERVAL_MINUTES
  ) {
    options.push(minutesToTimeString(minutes))
  }

  return options
}

/**
 * Split "HH:mm" into its hour and minute parts.
 */
function splitTimeString(timeString) {
  if (!timeString) {
    return { hour: '', minute: '' }
  }

  const [hour, minute] = timeString.split(':')

  return { hour: hour ?? '', minute: minute ?? '' }
}

// ============================================================
// RESERVATIONS PAGE
// ============================================================

function ReservationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const reservationData = location.state

  const medicine = reservationData?.medicine
  const pharmacy = reservationData?.pharmacy
  const inventory = reservationData?.inventory

  // ==========================================================
  // STATE
  // ==========================================================

  const [currentTime, setCurrentTime] = useState(
    () => new Date(),
  )

  const [quantity, setQuantity] = useState(1)
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [createdReservation, setCreatedReservation] =
    useState(null)

  /*
   * Reservation pickup date is fixed to today.
   *
   * There is intentionally NO editable date input.
   */
  const pickupDate = getLocalDateString(currentTime)

  /*
   * Update reservation availability every 30 seconds.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  /*
   * Calculate the earliest pickup using the current
   * clock state.
   */
  const earliestPickupTime = useMemo(() => {
    return getEarliestPickupTime(currentTime)
  }, [currentTime])

  /*
   * null means there is no valid same-day pickup time
   * remaining before the 8:00 PM cutoff.
   */
  const reservationWindowClosed =
    earliestPickupTime === null

  /*
   * Full list of valid pickup times, spaced every 5 minutes.
   */
  const pickupTimeOptions = useMemo(() => {
    if (!earliestPickupTime) {
      return []
    }

    return buildPickupTimeOptions(earliestPickupTime)
  }, [earliestPickupTime])

  /*
   * Unique hour list derived from the valid time options.
   * Always spans from the earliest allowed hour up to 8 PM.
   */
  const pickupHourOptions = useMemo(() => {
    const seen = new Set()
    const hours = []

    pickupTimeOptions.forEach((time) => {
      const hour = time.split(':')[0]

      if (!seen.has(hour)) {
        seen.add(hour)
        hours.push(hour)
      }
    })

    return hours
  }, [pickupTimeOptions])

  /*
   * Minute list depends on the selected hour:
   * - If the selected hour is the earliest hour, only
   *   minutes >= the earliest minute are shown.
   * - Otherwise, minutes from 00 to 55 in 5-min steps.
   */
  const pickupMinuteOptions = useMemo(() => {
    const { hour: selectedHour } = splitTimeString(pickupTime)

    if (!selectedHour) {
      return []
    }

    const earliestParts = splitTimeString(
      earliestPickupTime ?? '',
    )

    let startMinute = 0

    if (selectedHour === earliestParts.hour) {
      startMinute = Number(earliestParts.minute) || 0
    }

    const minutes = []

    for (
      let minute = startMinute;
      minute < 60;
      minute += PICKUP_INTERVAL_MINUTES
    ) {
      minutes.push(String(minute).padStart(2, '0'))
    }

    return minutes
  }, [pickupTime, earliestPickupTime])

  /*
   * Clear a previously selected pickup time when it
   * becomes invalid while the page remains open.
   */
  useEffect(() => {
    if (!pickupTime) {
      return
    }

    if (
      reservationWindowClosed ||
      !isPickupTimeAllowed(
        pickupTime,
        earliestPickupTime,
      )
    ) {
      setPickupTime('')
    }
  }, [
    earliestPickupTime,
    pickupTime,
    reservationWindowClosed,
  ])

  /*
   * This page expects the medicine/pharmacy/inventory
   * selection to come from the medicine details flow.
   */
  useEffect(() => {
    if (!medicine || !pharmacy || !inventory) {
      navigate('/search', { replace: true })
    }
  }, [
    medicine,
    pharmacy,
    inventory,
    navigate,
  ])

  // ==========================================================
  // INVENTORY / PRICE
  // ==========================================================

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

  // ==========================================================
  // QUANTITY
  // ==========================================================

  const increaseQuantity = () => {
    setError('')

    setQuantity((current) => {
      if (current >= availableStock) {
        return current
      }

      return current + 1
    })
  }

  const decreaseQuantity = () => {
    setError('')

    setQuantity((current) => {
      if (current <= 1) {
        return 1
      }

      return current - 1
    })
  }

  // ==========================================================
  // PICKUP TIME
  // ==========================================================

  const handlePickupHourChange = (event) => {
    const nextHour = event.target.value

    setError('')

    if (!nextHour) {
      setPickupTime('')
      return
    }

    const { minute: currentMinute } =
      splitTimeString(pickupTime)

    const earliestParts = splitTimeString(
      earliestPickupTime ?? '',
    )

    // Pick a sensible default minute for the chosen hour.
    let nextMinute = currentMinute

    if (nextHour === earliestParts.hour) {
      const earliestMinute = Number(earliestParts.minute) || 0

      if (
        !nextMinute ||
        Number(nextMinute) < earliestMinute
      ) {
        nextMinute = String(earliestMinute).padStart(2, '0')
      }
    } else if (!nextMinute) {
      nextMinute = '00'
    }

    setPickupTime(`${nextHour}:${nextMinute}`)
  }

  const handlePickupMinuteChange = (event) => {
    const nextMinute = event.target.value

    setError('')

    const { hour: currentHour } =
      splitTimeString(pickupTime)

    if (!currentHour || !nextMinute) {
      return
    }

    setPickupTime(`${currentHour}:${nextMinute}`)
  }

  // ==========================================================
  // CREATE RESERVATION
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setError('')

    // --------------------------------------------------------
    // Source data
    // --------------------------------------------------------

    if (!medicine || !pharmacy || !inventory) {
      setError(
        'Reservation information is incomplete.',
      )
      return
    }

    // --------------------------------------------------------
    // Re-check the reservation window at submission time
    // --------------------------------------------------------

    const submissionTime = new Date()

    const latestEarliestPickupTime =
      getEarliestPickupTime(submissionTime)

    if (!latestEarliestPickupTime) {
      setError(
        'Reservations are closed for today because there is no longer enough time for the pharmacy to prepare your order before the 8:00 PM pickup cutoff.',
      )
      return
    }

    // --------------------------------------------------------
    // Pharmacy
    // --------------------------------------------------------

    const pharmacyId = Number(pharmacy.pharmacy_id)

    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      setError('The selected pharmacy is invalid.')
      return
    }

    // --------------------------------------------------------
    // Medicine
    // --------------------------------------------------------

    const medicineId = Number(medicine.medicine_id)

    if (
      !Number.isInteger(medicineId) ||
      medicineId <= 0
    ) {
      setError('The selected medicine is invalid.')
      return
    }

    // --------------------------------------------------------
    // Quantity
    // --------------------------------------------------------

    const requestedQuantity = Number(quantity)

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      setError('Quantity must be at least 1.')
      return
    }

    if (requestedQuantity > availableStock) {
      setError(
        'The requested quantity is greater than the available stock.',
      )
      return
    }

    // --------------------------------------------------------
    // Same-day pickup
    // --------------------------------------------------------

    const submissionDate =
      getLocalDateString(submissionTime)

    if (pickupDate !== submissionDate) {
      setError(
        'The reservation date has changed. Please refresh the page and try again.',
      )
      return
    }

    // --------------------------------------------------------
    // Pickup time
    // --------------------------------------------------------

    if (!pickupTime) {
      setError('Please select a pickup time.')
      return
    }

    const normalizedPickupTime = pickupTime.trim()

    if (
      !/^\d{2}:\d{2}$/.test(normalizedPickupTime)
    ) {
      setError('Please select a valid pickup time.')
      return
    }

    if (
      !isPickupTimeAllowed(
        normalizedPickupTime,
        latestEarliestPickupTime,
      )
    ) {
      setError(
        `Please select a pickup time from ${formatPickupTime(
          latestEarliestPickupTime,
        )} to 8:00 PM. The pharmacy needs at least ${PREPARATION_BUFFER_MINUTES} minutes to prepare your reservation.`,
      )
      return
    }

    // --------------------------------------------------------
    // Notes
    // --------------------------------------------------------

    const trimmedNotes = notes.trim()

    if (trimmedNotes.length > 500) {
      setError('Notes cannot exceed 500 characters.')
      return
    }

    // --------------------------------------------------------
    // API request
    // --------------------------------------------------------

    try {
      setSubmitting(true)

      const response =
      await api.createReservation({
        pharmacy_id:
          pharmacyId,

        pickup_date:
          pickupDate,

        pickup_time:
          normalizedPickupTime,

        notes:
          trimmedNotes || null,

        items: [
          {
            medicine_id:
              medicineId,

            quantity:
              requestedQuantity,
          },
        ],
      })

      if (!response?.success) {
        throw new Error(
          response?.message ||
            'Failed to create reservation.',
        )
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.reservations,
        }),

        queryClient.invalidateQueries({
          queryKey:
            queryKeys.availableMedicines,
        }),
      ])
      
      const reservation =
        response?.data?.reservation ||
        response?.data ||
        null

      setCreatedReservation(reservation)
      setSuccess(true)
    } catch (error) {
      console.error(
        'Create reservation error:',
        error,
      )

      setError(
        error?.message ||
          'Failed to create reservation. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================================
  // SUCCESS VIEW
  // ==========================================================

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
            Your medicine has been reserved for
            same-day pickup.
          </p>

          {createdReservation?.reservation_id && (
            <p className="mt-3 text-xs font-bold text-[var(--primary)]">
              Reservation #
              {createdReservation.reservation_id}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-[var(--success-border)] bg-[var(--surface)] p-4 text-left">

            {/* Medicine */}
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

            {/* Pharmacy */}
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

            {/* Pickup */}
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
                    Today ·{' '}
                    {formatPickupDate(pickupDate)}
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
                    {formatPickupTime(pickupTime)}
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

  // ==========================================================
  // INVALID NAVIGATION STATE
  // ==========================================================

  if (!medicine || !pharmacy || !inventory) {
    return null
  }

  // ==========================================================
  // MAIN VIEW
  // ==========================================================

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

      {/* Heading */}
      <div className="mb-6">

        <p className="text-xs font-semibold text-[var(--primary)]">
          Reservation
        </p>

        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
          Reserve for pickup
        </h1>

        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          Reserve your medicine for same-day pickup
          between 8:00 AM and 8:00 PM.
        </p>

      </div>

      {/* Medicine */}
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
              {medicine.dosage} • {medicine.dosage_form}
            </p>

          </div>
        </div>

        {medicine.requires_prescription && (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5">

            <p className="text-xs font-bold text-amber-700">
              Prescription required
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
              You may need to present a valid prescription
              when picking up this medicine.
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
                  quantity <= 1 ||
                  submitting ||
                  reservationWindowClosed
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
                  submitting ||
                  reservationWindowClosed
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

        {/* Reservation closed */}
        {reservationWindowClosed && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <div className="flex items-start gap-3">

              <Clock3
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>

                <h2 className="text-sm font-extrabold text-amber-800">
                  Reservations are closed for today
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  There is no longer enough time for the
                  pharmacy to prepare your reservation
                  before the 8:00 PM pickup cutoff. You can
                  continue browsing and return tomorrow to
                  make a reservation.
                </p>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            PICKUP DATE
            FIXED TO TODAY - NO DATE INPUT
        ================================================== */}

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">

          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">

            <CalendarDays
              size={17}
              className="text-[var(--primary)]"
            />

            Pickup date

          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Reservations are for same-day pickup only.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Today
              </p>

              <p className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">
                {formatPickupDate(pickupDate)}
              </p>

            </div>

            <CheckCircle2
              size={20}
              className="text-[var(--primary)]"
            />

          </div>
        </div>

        {/* ==================================================
            PICKUP TIME
        ================================================== */}

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">

          <label
            className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]"
          >

            <Clock3
              size={17}
              className="text-[var(--primary)]"
            />

            Pickup time

          </label>

          {!reservationWindowClosed ? (
            <>

              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                Select a pickup time from{' '}
                <strong>
                  {formatPickupTime(
                    earliestPickupTime,
                  )}
                </strong>{' '}
                to <strong>8:00 PM</strong>.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">

                {/* Hour */}
                <label className="flex flex-col gap-1.5">

                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Hour
                  </span>

                  <select
                    value={
                      splitTimeString(pickupTime).hour
                    }
                    onChange={handlePickupHourChange}
                    disabled={submitting}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]"
                  >
                    <option value="">
                      Hour
                    </option>

                    {pickupHourOptions.map((hour) => (
                      <option
                        key={hour}
                        value={hour}
                      >
                        {formatPickupTime(`${hour}:00`)}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Minute */}
                <label className="flex flex-col gap-1.5">

                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Minutes
                  </span>

                  <select
                    value={
                      splitTimeString(pickupTime).minute
                    }
                    onChange={handlePickupMinuteChange}
                    disabled={
                      submitting ||
                      !splitTimeString(pickupTime).hour
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]"
                  >
                    <option value="">
                      Minutes
                    </option>

                    {pickupMinuteOptions.map((minute) => (
                      <option
                        key={minute}
                        value={minute}
                      >
                        :{minute}
                      </option>
                    ))}
                  </select>
                </label>

              </div>

              {pickupTime && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--surface-soft)] px-3 py-2.5">

                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Selected pickup time
                  </span>

                  <span className="text-sm font-extrabold text-[var(--primary)]">
                    {formatPickupTime(pickupTime)}
                  </span>

                </div>
              )}

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--primary-light)] px-3 py-2.5">

                <Clock3
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <p className="text-[11px] font-semibold leading-relaxed text-[var(--primary)]">
                  The pharmacy receives at least{' '}
                  {PREPARATION_BUFFER_MINUTES}{' '}
                  minutes to prepare your order.
                  Same-day pickup ends at 8:00 PM.
                </p>

              </div>

            </>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

              <p className="text-xs font-semibold leading-relaxed text-amber-700">
                No pickup times remain for today.
                Reservations will be available again
                tomorrow.
              </p>

            </div>
          )}

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
            Add any additional information for the pharmacy.
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

            disabled={
              submitting ||
              reservationWindowClosed
            }

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

        {/* Confirmation */}
        <div className="reservation-confirm-card">

          <div className="reservation-confirm-header">

            <div className="reservation-confirm-icon">
              <ShoppingBag size={17} />
            </div>

            <div className="reservation-confirm-copy">

              <h3>
                Confirm reservation
              </h3>

              <p>
                {reservationWindowClosed
                  ? 'No same-day pickup times remain for today.'
                  : `Reserve ${quantity} ${
                      quantity === 1
                        ? 'unit'
                        : 'units'
                    } at ${
                      pharmacy.name
                    } for pickup today.`}
              </p>

            </div>

          </div>

          <button
            type="submit"

            disabled={
              submitting ||
              availableStock <= 0 ||
              reservationWindowClosed
            }

            className="reservation-confirm-button"
          >

            {reservationWindowClosed ? (
              <>
                <Clock3 size={15} />

                <span>
                  Reservations closed for today
                </span>
              </>
            ) : submitting ? (
              'Submitting reservation...'
            ) : (
              <>
                <CheckCircle2 size={15} />

                <span>
                  Confirm reservation
                </span>
              </>
            )}

          </button>

        </div>

      </form>
    </section>
  )
}

