const supabaseAdmin = require('../config/supabaseAdmin')

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

/**
 * Create customer reservation with reservation items
 * POST /api/reservations
 */
const createReservation = async (req, res) => {
  try {
    // Customer ID comes from the authenticated PharmaLink user.
    // Do not accept customer_id from the frontend.
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

    // --------------------------------------------------
    // Validate pharmacy ID
    // --------------------------------------------------

    if (!isValidId(pharmacy_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pharmacy ID is required',
      })
    }

    // --------------------------------------------------
    // Validate pickup date
    // --------------------------------------------------

    if (!pickup_date || String(pickup_date).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Pickup date is required',
      })
    }

    // --------------------------------------------------
    // Validate pickup time
    // --------------------------------------------------

    if (!pickup_time || String(pickup_time).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Pickup time is required',
      })
    }

    // --------------------------------------------------
    // Validate reservation items
    // --------------------------------------------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required',
      })
    }

    for (const item of items) {
      if (!isValidId(item.medicine_id)) {
        return res.status(400).json({
          success: false,
          message: 'Each reservation item must have a valid medicine ID',
        })
      }

      if (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each reservation item must have a valid quantity',
        })
      }
    }

    // --------------------------------------------------
    // Verify pharmacy exists and is active
    // --------------------------------------------------

    const { data: pharmacy, error: pharmacyError } =
      await supabaseAdmin
        .from('pharmacies')
        .select('pharmacy_id, name, status')
        .eq('pharmacy_id', Number(pharmacy_id))
        .maybeSingle()

    if (pharmacyError) {
      console.error('Pharmacy lookup error:', pharmacyError)

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

    // --------------------------------------------------
    // Get inventory for requested medicines
    // --------------------------------------------------

    const medicineIds = items.map((item) => Number(item.medicine_id))

    const { data: inventoryRows, error: inventoryError } =
      await supabaseAdmin
        .from('inventory')
        .select(`
          inventory_id,
          pharmacy_id,
          medicine_id,
          quantity,
          unit_price,
          status,
          medicines (
            medicine_id,
            generic_name,
            brand_name,
            status
          )
        `)
        .eq('pharmacy_id', Number(pharmacy_id))
        .in('medicine_id', medicineIds)
        .eq('status', 'AVAILABLE')
        .gt('quantity', 0)

    if (inventoryError) {
      console.error('Inventory lookup error:', inventoryError)

      return res.status(500).json({
        success: false,
        message: 'Failed to verify medicine availability',
      })
    }

    // --------------------------------------------------
    // Create quick inventory lookup
    // --------------------------------------------------

    const inventoryMap = new Map(
      (inventoryRows || []).map((row) => [
        Number(row.medicine_id),
        row,
      ])
    )

    // --------------------------------------------------
    // Verify every requested medicine
    // --------------------------------------------------

    for (const item of items) {
      const medicineId = Number(item.medicine_id)
      const requestedQuantity = Number(item.quantity)

      const inventory = inventoryMap.get(medicineId)

      if (!inventory) {
        return res.status(400).json({
          success: false,
          message: `Medicine ${medicineId} is not available at the selected pharmacy`,
        })
      }

      if (
        !inventory.medicines ||
        inventory.medicines.status !== 'ACTIVE'
      ) {
        return res.status(400).json({
          success: false,
          message: `Medicine ${medicineId} is not currently active`,
        })
      }

      if (requestedQuantity > Number(inventory.quantity)) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for medicine ${medicineId}. ` +
            `Available quantity: ${inventory.quantity}`,
        })
      }
    }

    // --------------------------------------------------
    // Create reservation
    // --------------------------------------------------

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
        pickup_date: String(pickup_date).trim(),
        pickup_time: String(pickup_time).trim(),
        status: 'PENDING',
        notes: notes?.trim() || null,
      })
      .select(`
        reservation_id,
        customer_id,
        pharmacy_id,
        reservation_date,
        pickup_date,
        pickup_time,
        status,
        notes,
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

    // --------------------------------------------------
    // Create reservation items
    // --------------------------------------------------

    const reservationItems = items.map((item) => {
      const inventory = inventoryMap.get(
        Number(item.medicine_id)
      )

      return {
        reservation_id: reservation.reservation_id,
        medicine_id: Number(item.medicine_id),
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

      // Remove reservation if item creation fails.
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

    // --------------------------------------------------
    // Return successful reservation
    // --------------------------------------------------

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

module.exports = {
  createReservation,
}
