const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

const isValidId = (value) => {
  const number = Number(value)

  return Number.isInteger(number) && number > 0
}

/**
 * Validate YYYY-MM-DD pickup date.
 * The date cannot be before today.
 */
const isValidPickupDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateRegex.test(dateString)) {
    return false
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const testDate = new Date(year, month - 1, day)

  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return false
  }

  // Compare using local calendar dates.
  const today = new Date()

  today.setHours(0, 0, 0, 0)
  testDate.setHours(0, 0, 0, 0)

  if (testDate < today) {
    return false
  }

  return true
}

/**
 * Validate HH:mm pickup time.
 */
const isValidPickupTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return false
  }

  const timeRegex = /^\d{2}:\d{2}$/

  if (!timeRegex.test(timeString)) {
    return false
  }

  const [hours, minutes] = timeString.split(':').map(Number)

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  )
}

/**
 * Prevent duplicate medicine IDs in one reservation.
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

/* ============================================================
   CREATE RESERVATION
   POST /api/reservations
============================================================ */

const createReservation = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    const {
      pharmacy_id,
      pickup_date,
      pickup_time,
      notes,
      items,
    } = req.body

    /* --------------------------------------------------------
       Validate pharmacy
    -------------------------------------------------------- */

    if (!isValidId(pharmacy_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pharmacy ID is required',
      })
    }

    /* --------------------------------------------------------
       Validate pickup date
    -------------------------------------------------------- */

    if (!pickup_date || String(pickup_date).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Pickup date is required',
      })
    }

    const pickupDate = String(pickup_date).trim()

    if (!isValidPickupDate(pickupDate)) {
      return res.status(400).json({
        success: false,
        message:
          'Pickup date must be a valid YYYY-MM-DD format and cannot be in the past',
      })
    }

    /* --------------------------------------------------------
       Validate pickup time
    -------------------------------------------------------- */

    if (!pickup_time || String(pickup_time).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Pickup time is required',
      })
    }

    const pickupTime = String(pickup_time).trim()

    if (!isValidPickupTime(pickupTime)) {
      return res.status(400).json({
        success: false,
        message:
          'Pickup time must be a valid HH:mm format (e.g., 14:30)',
      })
    }

    /* --------------------------------------------------------
       Validate items
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
       Verify pharmacy
    -------------------------------------------------------- */

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        pharmacy_id,
        name,
        address,
        status
      `)
      .eq('pharmacy_id', Number(pharmacy_id))
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Pharmacy lookup error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to verify pharmacy',
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
      })
    }

    if (pharmacy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Selected pharmacy is not active',
      })
    }

    /* --------------------------------------------------------
       Medicine IDs
    -------------------------------------------------------- */

    const medicineIds = items.map((item) =>
      Number(item.medicine_id)
    )

    /* --------------------------------------------------------
       Get inventory
    -------------------------------------------------------- */

    const {
      data: inventoryRows,
      error: inventoryError,
    } = await supabaseAdmin
      .from('inventory')
      .select(`
        inventory_id,
        pharmacy_id,
        medicine_id,
        batch_number,
        quantity,
        unit_price,
        expiration_date,
        status,

        medicines (
          medicine_id,
          pharmacy_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form,
          requires_prescription,
          status
        )
      `)
      .eq('pharmacy_id', Number(pharmacy_id))
      .in('medicine_id', medicineIds)
      .eq('status', 'AVAILABLE')
      .gt('quantity', 0)

    if (inventoryError) {
      console.error(
        'Inventory lookup error:',
        inventoryError
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to verify medicine availability',
      })
    }

    /* --------------------------------------------------------
       Build inventory lookup
    -------------------------------------------------------- */

    const inventoryMap = new Map()

    for (const row of inventoryRows || []) {
      const medicineId = Number(row.medicine_id)

      /*
       * Extra protection:
       * The medicine itself must belong to the same pharmacy.
       */
      if (
        !row.medicines ||
        Number(row.medicines.pharmacy_id) !==
          Number(pharmacy_id)
      ) {
        continue
      }

      if (!inventoryMap.has(medicineId)) {
        inventoryMap.set(medicineId, {
          medicine_id: medicineId,
          total_quantity: 0,
          unit_price: Number(row.unit_price),
          batches: [],
          medicine: row.medicines,
        })
      }

      const inventory = inventoryMap.get(medicineId)

      inventory.total_quantity += Number(row.quantity)

      inventory.batches.push({
        inventory_id: row.inventory_id,
        batch_number: row.batch_number,
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        expiration_date: row.expiration_date,
        status: row.status,
      })
    }

    /* --------------------------------------------------------
       Verify every requested medicine
    -------------------------------------------------------- */

    for (const item of items) {
      const medicineId = Number(item.medicine_id)
      const requestedQuantity = Number(item.quantity)

      const inventory = inventoryMap.get(medicineId)

      if (!inventory) {
        return res.status(400).json({
          success: false,
          message:
            `Medicine ${medicineId} is not available at the selected pharmacy`,
        })
      }

      if (
        !inventory.medicine ||
        inventory.medicine.status !== 'ACTIVE'
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Medicine ${medicineId} is not currently active`,
        })
      }

      if (requestedQuantity > inventory.total_quantity) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for medicine ${medicineId}. ` +
            `Available quantity: ${inventory.total_quantity}`,
        })
      }
    }

    /* --------------------------------------------------------
       Create reservation
    -------------------------------------------------------- */

    const reservationDate = new Date()
      .toISOString()
      .split('T')[0]

    const {
      data: reservation,
      error: reservationError,
    } = await supabaseAdmin
      .from('reservations')
      .insert({
        customer_id: customerId,
        pharmacy_id: Number(pharmacy_id),
        reservation_date: reservationDate,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        status: 'PENDING',
        notes:
          typeof notes === 'string' && notes.trim()
            ? notes.trim()
            : null,
      })
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

    if (reservationError) {
      console.error(
        'Create reservation error:',
        reservationError
      )

      return res.status(400).json({
        success: false,
        message: 'Failed to create reservation',
        error: reservationError.message,
        code: reservationError.code,
      })
    }

    /* --------------------------------------------------------
       Create reservation items
    -------------------------------------------------------- */

    const reservationItems = items.map((item) => {
      const medicineId = Number(item.medicine_id)

      const inventory = inventoryMap.get(medicineId)

      return {
        reservation_id: reservation.reservation_id,
        medicine_id: medicineId,
        quantity: Number(item.quantity),
        unit_price: Number(inventory.unit_price),
      }
    })

    const {
      data: createdItems,
      error: itemsError,
    } = await supabaseAdmin
      .from('reservation_items')
      .insert(reservationItems)
      .select(`
        reservation_item_id,
        reservation_id,
        medicine_id,
        quantity,
        unit_price,
        created_at
      `)

    if (itemsError) {
      console.error(
        'Create reservation items error:',
        itemsError
      )

      await supabaseAdmin
        .from('reservations')
        .delete()
        .eq(
          'reservation_id',
          reservation.reservation_id
        )

      return res.status(400).json({
        success: false,
        message: 'Failed to create reservation items',
        error: itemsError.message,
        code: itemsError.code,
      })
    }

    /* --------------------------------------------------------
       Success
    -------------------------------------------------------- */

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        reservation,
        items: createdItems,
        pharmacy,
      },
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
      .eq('customer_id', customerId)
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
      .eq('customer_id', customerId)
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
       Find reservation belonging to this pharmacy
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
       Valid pharmacy status transitions
       
       PENDING
          ├── CONFIRMED
          └── CANCELLED

       CONFIRMED
          ├── COMPLETED
          └── CANCELLED

       COMPLETED → no changes
       CANCELLED → no changes
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
       Build update
    -------------------------------------------------------- */

    const updateData = {
      status,
    }

    if (status === 'CONFIRMED') {
      updateData.confirmed_by = staffUserId
      updateData.confirmed_at =
        new Date().toISOString()
    }

    if (status === 'COMPLETED') {
      updateData.completed_at =
        new Date().toISOString()
    }

    if (status === 'CANCELLED') {
      /*
       * Keep the confirmation history if the reservation
       * was previously confirmed.
       *
       * Do NOT erase confirmed_by / confirmed_at.
       */
    }

    /* --------------------------------------------------------
       Update
    -------------------------------------------------------- */

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
   CANCEL RESERVATION — CUSTOMER
   PATCH /api/reservations/:reservationId/cancel
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
       Find customer's reservation
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
        status
      `)
      .eq('reservation_id', reservationId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (reservationError) {
      console.error(
        'Get reservation for cancellation error:',
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
       Customer can ONLY cancel PENDING reservations.
    -------------------------------------------------------- */

    if (reservation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message:
          `Reservation cannot be cancelled because its current status is ${reservation.status}`,
      })
    }

    /* --------------------------------------------------------
       Cancel reservation
    -------------------------------------------------------- */

    const {
      data: cancelledReservation,
      error: updateError,
    } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'CANCELLED',
      })
      .eq('reservation_id', reservationId)
      .eq('customer_id', customerId)
      .eq('status', 'PENDING')
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
      .maybeSingle()

    if (updateError) {
      console.error(
        'Cancel reservation error:',
        updateError
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to cancel reservation',
      })
    }

    if (!cancelledReservation) {
      return res.status(409).json({
        success: false,
        message:
          'Reservation could not be cancelled because its status has already changed',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: cancelledReservation,
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
  cancelReservation,
}