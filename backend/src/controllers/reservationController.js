const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate positive integer ID.
 */
const isValidId = (value) => {
  const number = Number(value)

  return Number.isInteger(number) && number > 0
}

/* ============================================================
   SAME-DAY RESERVATION RULES
============================================================ */

const RESERVATION_TIME_ZONE = 'Asia/Manila'
const PICKUP_START_TIME = '08:00'
const PICKUP_END_TIME = '20:00'

/**
 * Return the current calendar date in the PharmaLink
 * operating timezone.
 *
 * Do not rely on the Vercel/server timezone because it may
 * run in UTC.
 */
const getPharmaLinkDateString = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESERVATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return `${values.year}-${values.month}-${values.day}`
}

/**
 * Return the current time in HH:mm using the PharmaLink
 * operating timezone.
 */
const getPharmaLinkTimeString = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESERVATION_TIME_ZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date())

  const values = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  /*
   * Some Intl implementations may represent midnight
   * as 24:00. Normalize it to 00:00.
   */
  const hour =
    values.hour === '24'
      ? '00'
      : values.hour

  return `${hour}:${values.minute}`
}

/**
 * Validate YYYY-MM-DD.
 *
 * PharmaLink reservations are SAME-DAY ONLY.
 */
const isValidPickupDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateRegex.test(dateString)) {
    return false
  }

  const [year, month, day] =
    dateString.split('-').map(Number)

  const testDate = new Date(
    Date.UTC(year, month - 1, day),
  )

  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    return false
  }

  return dateString === getPharmaLinkDateString()
}

/**
 * Validate HH:mm.
 *
 * Valid pickup window:
 * 8:00 AM through 8:00 PM.
 */
const isValidPickupTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return false
  }

  const timeRegex = /^\d{2}:\d{2}$/

  if (!timeRegex.test(timeString)) {
    return false
  }

  const [hours, minutes] =
    timeString.split(':').map(Number)

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return false
  }

  return (
    timeString >= PICKUP_START_TIME &&
    timeString <= PICKUP_END_TIME
  )
}

/**
 * Determine whether customers are currently allowed
 * to create same-day reservations.
 *
 * Reservations stop at 8:00 PM Philippine time.
 */
const isReservationWindowClosed = () => {
  const currentTime = getPharmaLinkTimeString()

  return currentTime >= PICKUP_END_TIME
}
/**
 * Prevent duplicate medicine IDs inside one reservation.
 */
const checkDuplicateMedicines = (items) => {
  const medicineIds = new Set()

  for (const item of items) {
    const medicineId = Number(item.medicine_id)

    if (medicineIds.has(medicineId)) {
      return 'Cannot add the same medicine twice to one reservation'
    }

    medicineIds.add(medicineId)
  }

  return null
}

/**
 * Normalize PostgreSQL/Supabase RPC errors.
 *
 * PostgreSQL functions may return different wording depending
 * on the implementation. Keeping this logic centralized makes
 * the controller easier to maintain.
 */
const getRpcErrorMessage = (error) => {
  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    ''
  )
}

/* ============================================================
   CREATE RESERVATION
   POST /api/reservations

   IMPORTANT:
   Stock reservation, multi-batch allocation, row locking,
   overbooking protection, reservation creation, and rollback
   are handled by:

   create_reservation_atomic()
============================================================ */

const createReservation = async (req, res) => {
  try {
    /* --------------------------------------------------------
       Authentication
    -------------------------------------------------------- */

    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    if (req.pharmaUser.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can create reservations',
      })
    }

    /* --------------------------------------------------------
       Request body
    -------------------------------------------------------- */

    const {
      pharmacy_id,
      pickup_date,
      pickup_time,
      notes,
      items,
    } = req.body || {}

    /* --------------------------------------------------------
       Pharmacy validation
    -------------------------------------------------------- */

    if (!isValidId(pharmacy_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pharmacy ID is required',
      })
    }

    const pharmacyId = Number(pharmacy_id)

    /* --------------------------------------------------------
   Pickup date validation
-------------------------------------------------------- */
/* --------------------------------------------------------
   Same-day reservation window

   PharmaLink reservations:
   - must be picked up today
   - pickup hours are 8:00 AM to 8:00 PM
   - new reservations close at 8:00 PM
-------------------------------------------------------- */

if (isReservationWindowClosed()) {
  return res.status(400).json({
    success: false,
    code: 'RESERVATION_WINDOW_CLOSED',
    message:
      'Same-day reservations are unavailable after 8:00 PM. Please return tomorrow to create a new reservation.',
  })
}

/* --------------------------------------------------------
   Pickup date validation
-------------------------------------------------------- */

if (
  typeof pickup_date !== 'string' ||
  !isValidPickupDate(pickup_date.trim())
) {
  return res.status(400).json({
    success: false,
    code: 'INVALID_PICKUP_DATE',
    message:
      'Reservations are for same-day pickup only. Pickup date must be today.',
  })
}

const pickupDate = pickup_date.trim()

/* --------------------------------------------------------
   Pickup time validation
-------------------------------------------------------- */

if (
  typeof pickup_time !== 'string' ||
  !isValidPickupTime(pickup_time.trim())
) {
  return res.status(400).json({
    success: false,
    code: 'INVALID_PICKUP_TIME',
    message:
      'Pickup time must be between 8:00 AM and 8:00 PM.',
  })
}

const pickupTime = pickup_time.trim()
    /* --------------------------------------------------------
       Items validation
    -------------------------------------------------------- */

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required',
      })
    }

    const duplicateError = checkDuplicateMedicines(items)

    if (duplicateError) {
      return res.status(400).json({
        success: false,
        message: duplicateError,
      })
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reservation item',
        })
      }

      if (!isValidId(item.medicine_id)) {
        return res.status(400).json({
          success: false,
          message:
            'Each reservation item must have a valid medicine ID',
        })
      }

      const quantity = Number(item.quantity)

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message:
            'Each reservation item must have a valid quantity',
        })
      }
    }

    /* --------------------------------------------------------
       Normalize reservation items
    -------------------------------------------------------- */

    const reservationItems = items.map((item) => ({
      medicine_id: Number(item.medicine_id),
      quantity: Number(item.quantity),
    }))

    /* --------------------------------------------------------
       Atomic reservation creation
       
       The PostgreSQL function MUST:
       1. Lock relevant inventory rows.
       2. Consider all applicable inventory batches.
       3. Calculate available stock.
       4. Prevent overbooking.
       5. Reserve stock atomically.
       6. Create reservation.
       7. Create reservation_items.
       8. Roll back everything if any step fails.
    -------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      'create_reservation_atomic',
      {
        p_customer_id: Number(customerId),
        p_pharmacy_id: pharmacyId,
        p_pickup_date: pickupDate,
        p_pickup_time: pickupTime,
        p_notes:
          typeof notes === 'string' && notes.trim()
            ? notes.trim()
            : null,
        p_items: reservationItems,
      }
    )

    if (error) {
      console.error(
        'Atomic reservation creation error:',
        error
      )

      const message = getRpcErrorMessage(error)
      const normalizedMessage = message.toLowerCase()

      /* ------------------------------------------------------
         Stock / overbooking errors
      ------------------------------------------------------ */

      if (
        normalizedMessage.includes('insufficient stock') ||
        normalizedMessage.includes('not enough stock') ||
        normalizedMessage.includes('insufficient inventory') ||
        normalizedMessage.includes('overbook')
      ) {
        return res.status(409).json({
          success: false,
          message:
            message || 'Insufficient stock for one or more medicines',
        })
      }

      /* ------------------------------------------------------
         Pharmacy / medicine availability errors
      ------------------------------------------------------ */

      if (
        normalizedMessage.includes('not active') ||
        normalizedMessage.includes('inactive') ||
        normalizedMessage.includes('not found') ||
        normalizedMessage.includes('unavailable')
      ) {
        return res.status(400).json({
          success: false,
          message:
            message || 'One or more requested items are unavailable',
        })
      }

      /* ------------------------------------------------------
         Database constraint / validation errors
      ------------------------------------------------------ */

      if (
        error.code === '23505' ||
        error.code === '23514' ||
        error.code === '23503'
      ) {
        return res.status(400).json({
          success: false,
          message:
            message || 'Reservation data violates a database constraint',
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create reservation',
      })
    }

    /* --------------------------------------------------------
       Extract reservation ID
    -------------------------------------------------------- */

    const reservationId =
      data?.reservation_id

    if (!reservationId) {
      console.error(
        'Atomic reservation returned no reservation ID:',
        data
      )

      return res.status(500).json({
        success: false,
        message:
          'Reservation creation failed because no reservation ID was returned',
      })
    }

    /* --------------------------------------------------------
       Load complete reservation
    -------------------------------------------------------- */

    const {
      data: reservation,
      error: reservationError,
    } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        prescription_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
        confirmed_by,
        confirmed_at,
        completed_at,
        created_at,
        updated_at,

        pharmacies (
          pharmacy_id,
          name,
          address,
          status
        ),

        reservation_items (
          reservation_item_id,
          reservation_id,
          inventory_id,
          medicine_id,
          quantity,
          unit_price,
          created_at,

          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form,
            requires_prescription,
            status
          )
        )
      `)
      .eq('reservation_id', reservationId)
      .eq('customer_id', Number(customerId))
      .single()

    if (reservationError) {
      console.error(
        'Load created reservation error:',
        reservationError
      )

      /*
       * The transaction itself succeeded.
       * Do NOT report that the reservation failed.
       *
       * Return the ID so the client can retrieve it.
       */
      return res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: {
          reservation_id: reservationId,
        },
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: reservation,
    })
  } catch (error) {
    console.error(
      'Create reservation server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET CUSTOMER RESERVATIONS
   GET /api/reservations
============================================================ */

const getCustomerReservations = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    const {
      data: reservations,
      error,
    } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        prescription_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
        confirmed_by,
        confirmed_at,
        completed_at,
        created_at,
        updated_at,

        pharmacies (
          pharmacy_id,
          name,
          address,
          status
        ),

        reservation_items (
          reservation_item_id,
          reservation_id,
          inventory_id,
          medicine_id,
          quantity,
          unit_price,
          created_at,

          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form,
            requires_prescription,
            status
          )
        )
      `)
      .eq('customer_id', Number(customerId))
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Get customer reservations error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to load reservations',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Reservations loaded successfully',
      data: reservations || [],
    })
  } catch (error) {
    console.error(
      'Get customer reservations server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET CUSTOMER RESERVATION BY ID
   GET /api/reservations/:reservationId
============================================================ */

const getReservationById = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    const reservationId = Number(
      req.params.reservationId
    )

    if (!isValidId(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reservation ID is required',
      })
    }

    const {
      data: reservation,
      error,
    } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        prescription_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
        confirmed_by,
        confirmed_at,
        completed_at,
        created_at,
        updated_at,

        pharmacies (
          pharmacy_id,
          name,
          address,
          status
        ),

        reservation_items (
          reservation_item_id,
          reservation_id,
          inventory_id,
          medicine_id,
          quantity,
          unit_price,
          created_at,

          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form,
            requires_prescription,
            status
          )
        )
      `)
      .eq('reservation_id', reservationId)
      .eq('customer_id', Number(customerId))
      .maybeSingle()

    if (error) {
      console.error(
        'Get reservation by ID error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to load reservation',
      })
    }

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Reservation loaded successfully',
      data: reservation,
    })
  } catch (error) {
    console.error(
      'Get reservation by ID server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET PHARMACY RESERVATIONS
   GET /api/reservations/pharmacy
============================================================ */

const getPharmacyReservations = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message:
          'Pharmacy account is not assigned to a pharmacy',
      })
    }

    const {
      data: reservations,
      error,
    } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        prescription_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
        confirmed_by,
        confirmed_at,
        completed_at,
        created_at,
        updated_at,

        users!fk_reservations_customer (
          user_id,
          first_name,
          last_name,
          email,
          phone
        ),

        reservation_items (
          reservation_item_id,
          reservation_id,
          inventory_id,
          medicine_id,
          quantity,
          unit_price,
          created_at,

          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form,
            requires_prescription,
            status
          )
        )
      `)
      .eq('pharmacy_id', Number(pharmacyId))
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Get pharmacy reservations error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to load pharmacy reservations',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Pharmacy reservations loaded successfully',
      data: reservations || [],
    })
  } catch (error) {
    console.error(
      'Get pharmacy reservations server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   UPDATE RESERVATION STATUS — PHARMACY
   PATCH /api/reservations/:reservationId/status

   NOTE:
   Cancellation through this endpoint does NOT directly modify
   inventory.

   If pharmacy cancellation must restore reserved stock, the
   database should perform the status change + stock restoration
   atomically through a dedicated RPC.
============================================================ */

const updateReservationStatus = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id
    const staffUserId = req.pharmaUser?.user_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message:
          'Pharmacy account is not assigned to a pharmacy',
      })
    }

    if (!staffUserId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated pharmacy staff member not found',
      })
    }

    const reservationId = Number(
      req.params.reservationId
    )

    const status =
      typeof req.body?.status === 'string'
        ? req.body.status.trim().toUpperCase()
        : null

    if (!isValidId(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reservation ID is required',
      })
    }

    const allowedStatuses = [
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
    ]

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid reservation status. Allowed values: CONFIRMED, COMPLETED, CANCELLED',
      })
    }

    /* --------------------------------------------------------
       Load reservation
    -------------------------------------------------------- */

    const {
      data: reservation,
      error: reservationError,
    } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        status,
        confirmed_by,
        confirmed_at,
        completed_at
      `)
      .eq('reservation_id', reservationId)
      .eq('pharmacy_id', Number(pharmacyId))
      .maybeSingle()

    if (reservationError) {
      console.error(
        'Get reservation for status update error:',
        reservationError
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to load reservation',
      })
    }

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      })
    }

    /* --------------------------------------------------------
       Valid status transitions
    -------------------------------------------------------- */

    const validTransitions = {
      PENDING: [
        'CONFIRMED',
        'CANCELLED',
      ],

      CONFIRMED: [
        'COMPLETED',
        'CANCELLED',
      ],
    }

    const currentStatus = reservation.status

    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Reservation cannot be changed from ${currentStatus} to ${status}`,
      })
    }

    /* --------------------------------------------------------
       Pharmacy cancellation
       
       IMPORTANT:
       Stock must be restored atomically with the cancellation.
       Do not perform a normal UPDATE for CANCELLED.
    -------------------------------------------------------- */

    if (status === 'CANCELLED') {
      const {
        data,
        error,
      } = await supabaseAdmin.rpc(
        'cancel_pharmacy_reservation_atomic',
        {
          p_pharmacy_id: Number(pharmacyId),
          p_reservation_id: reservationId,
          p_cancelled_by: Number(staffUserId),
        }
      )

      if (error) {
        console.error(
          'Atomic pharmacy cancellation error:',
          error
        )

        const message = getRpcErrorMessage(error)
        const normalizedMessage =
          message.toLowerCase()

        if (
          normalizedMessage.includes('not found')
        ) {
          return res.status(404).json({
            success: false,
            message: 'Reservation not found',
          })
        }

        if (
          normalizedMessage.includes('cannot be cancelled') ||
          normalizedMessage.includes('already cancelled')
        ) {
          return res.status(400).json({
            success: false,
            message:
              message || 'Reservation cannot be cancelled',
          })
        }

        return res.status(500).json({
          success: false,
          message:
            'Failed to cancel reservation',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Reservation cancelled successfully',
        data,
      })
    }

    /* --------------------------------------------------------
       Confirm / complete reservation
    -------------------------------------------------------- */

    const updateData = {
      status,
    }

    if (status === 'CONFIRMED') {
      updateData.confirmed_by = Number(staffUserId)
      updateData.confirmed_at =
        new Date().toISOString()
    }

    if (status === 'COMPLETED') {
      updateData.completed_at =
        new Date().toISOString()
    }

    const {
      data: updatedReservation,
      error: updateError,
    } = await supabaseAdmin
      .from('reservations')
      .update(updateData)
      .eq('reservation_id', reservationId)
      .eq('pharmacy_id', Number(pharmacyId))
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        prescription_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
        confirmed_by,
        confirmed_at,
        completed_at,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error(
        'Update reservation status error:',
        updateError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to update reservation status',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        `Reservation ${status.toLowerCase()} successfully`,
      data: updatedReservation,
    })
  } catch (error) {
    console.error(
      'Update reservation status server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   COMPLETE RESERVATION -> RECORD SALE
   POST /api/reservations/:reservationId/complete
============================================================ */

const completeReservationWithSale = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id
    const staffUserId = req.pharmaUser?.user_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    if (!staffUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated staff member not found',
      })
    }

    const reservationId = Number(req.params.reservationId)

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid reservation ID is required',
      })
    }

    const paymentMethod = String(
      req.body?.payment_method || 'CASH',
    ).toUpperCase()

    const { data, error } = await supabaseAdmin.rpc(
      'create_sale_from_reservation_atomic',
      {
        p_pharmacy_id: Number(pharmacyId),
        p_reservation_id: reservationId,
        p_processed_by: Number(staffUserId),
        p_payment_method: paymentMethod,
        p_notes: null,
      },
    )

    if (error) {
      console.error('Complete reservation w/ sale error:', error)

      const message = error?.message || error?.details || ''
      const normalized = message.toLowerCase()

      if (normalized.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        })
      }

      if (
        normalized.includes('must be confirmed') ||
        normalized.includes('invalid payment')
      ) {
        return res.status(400).json({
          success: false,
          message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to complete reservation and record sale',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Reservation completed and sale recorded',
      data,
    })
  } catch (error) {
    console.error('Complete reservation w/ sale server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   CANCEL RESERVATION — CUSTOMER
   PATCH /api/reservations/:reservationId/cancel

   Atomic cancellation restores reserved stock.
============================================================ */

const cancelReservation = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    if (req.pharmaUser.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message:
          'Only customers can cancel their reservations',
      })
    }

    const reservationId = Number(
      req.params.reservationId
    )

    if (!isValidId(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reservation ID is required',
      })
    }

    /* --------------------------------------------------------
       Atomic cancellation
       
       The database function MUST:
       1. Lock the reservation.
       2. Verify ownership.
       3. Verify cancellable status.
       4. Restore reserved stock.
       5. Mark reservation CANCELLED.
       6. Commit everything atomically.
    -------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      'cancel_customer_reservation_atomic',
      {
        p_customer_id: Number(customerId),
        p_reservation_id: reservationId,
      }
    )

    if (error) {
      console.error(
        'Atomic customer cancellation error:',
        error
      )

      const message = getRpcErrorMessage(error)
      const normalizedMessage =
        message.toLowerCase()

      if (
        normalizedMessage.includes('not found') ||
        normalizedMessage.includes('does not exist')
      ) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        })
      }

      if (
        normalizedMessage.includes('cannot be cancelled') ||
        normalizedMessage.includes('already cancelled') ||
        normalizedMessage.includes('completed')
      ) {
        return res.status(400).json({
          success: false,
          message:
            message || 'Reservation cannot be cancelled',
        })
      }

      return res.status(500).json({
        success: false,
        message:
          'Failed to cancel reservation',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Reservation cancelled successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Cancel reservation server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createReservation,
  getCustomerReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  completeReservationWithSale,
  cancelReservation,
}
