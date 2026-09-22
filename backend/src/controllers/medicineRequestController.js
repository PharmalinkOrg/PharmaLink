  const supabaseAdmin = require('../config/supabaseAdmin')

  const requestColumns = `
    medicine_request_id,
    customer_id,
    pharmacy_id,
    status,
    notes,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at,
    users:customer_id ( first_name, last_name, email, phone ),
    medicine_request_items (
      medicine_request_item_id,
      medicine_id,
      requested_quantity,
      available_quantity,
      notes,
      medicines ( generic_name, brand_name, dosage, dosage_form, requires_prescription )
    )
  `

  const validTransitions = {
    PENDING: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE'],
    AVAILABLE: ['FULFILLED'],
    PARTIALLY_AVAILABLE: ['FULFILLED'],
    UNAVAILABLE: ['CANCELLED'],
    FULFILLED: [],
    CANCELLED: [],
  }

  const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0

  /**
   * GET medicine requests for the authenticated pharmacy
   * GET /api/medicine-requests/pharmacy
   * SUPER_ADMIN sees all; PHARMACY_ADMIN/STAFF scoped to their own pharmacy.
   */
  const getPharmacyMedicineRequests = async (req, res) => {
    try {
      let query = supabaseAdmin
        .from('medicine_requests')
        .select(requestColumns)
        .order('created_at', { ascending: false })

      if (req.pharmaUser.role !== 'SUPER_ADMIN') {
        query = query.eq('pharmacy_id', req.pharmaUser.pharmacy_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Get pharmacy medicine requests error:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve medicine requests',
          error: error.message,
        })
      }

      return res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      console.error('Get pharmacy medicine requests server error:', error)
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      })
    }
  }

  /**
   * GET a single medicine request
   * GET /api/medicine-requests/:requestId
   */
  const getMedicineRequestById = async (req, res) => {
    try {
      const requestId = Number(req.params.requestId)

      if (!isValidId(requestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine request ID',
        })
      }

      const { data, error } = await supabaseAdmin
        .from('medicine_requests')
        .select(requestColumns)
        .eq('medicine_request_id', requestId)
        .single()

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Medicine request not found',
          })
        }
        console.error('Get medicine request error:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve medicine request',
          error: error?.message,
        })
      }

      if (
        req.pharmaUser.role !== 'SUPER_ADMIN' &&
        data.pharmacy_id !== req.pharmaUser.pharmacy_id
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this medicine request',
        })
      }

      return res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      console.error('Get medicine request server error:', error)
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      })
    }
  }

  /**
   * UPDATE medicine request status
   * PATCH /api/medicine-requests/:requestId/status
   */
  const updateMedicineRequestStatus = async (req, res) => {
    try {
      const requestId = Number(req.params.requestId)
      const { status } = req.body

      if (!isValidId(requestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine request ID',
        })
      }

      if (!status || !Object.keys(validTransitions).includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value',
        })
      }

      const { data: existingRequest, error: findError } = await supabaseAdmin
        .from('medicine_requests')
        .select('medicine_request_id, pharmacy_id, status')
        .eq('medicine_request_id', requestId)
        .single()

      if (findError || !existingRequest) {
        return res.status(404).json({
          success: false,
          message: 'Medicine request not found',
        })
      }

      if (
        req.pharmaUser.role !== 'SUPER_ADMIN' &&
        existingRequest.pharmacy_id !== req.pharmaUser.pharmacy_id
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this medicine request',
        })
      }

      const allowedNextStatuses = validTransitions[existingRequest.status] || []
      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${existingRequest.status} to ${status}`,
        })
      }

      const updates = {
        status,
        reviewed_by: req.pharmaUser.user_id,
        reviewed_at: new Date().toISOString(),
      }

      const { data, error } = await supabaseAdmin
        .from('medicine_requests')
        .update(updates)
        .eq('medicine_request_id', requestId)
        .select(requestColumns)
        .single()

      if (error) {
        console.error('Update medicine request status error:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to update medicine request status',
          error: error.message,
        })
      }

      return res.status(200).json({
        success: true,
        message: `Medicine request marked as ${status.replaceAll('_', ' ').toLowerCase()}`,
        data,
      })
    } catch (error) {
      console.error('Update medicine request status server error:', error)
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      })
    }
  }

  /**
 * CREATE medicine request — CUSTOMER
 * POST /api/medicine-requests
 */
const createMedicineRequest = async (req, res) => {
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
        message: 'Only customers can create medicine requests',
      })
    }

    const {
      pharmacy_id,
      notes,
      items,
    } = req.body || {}

    // --------------------------------------------------
    // Validate pharmacy
    // --------------------------------------------------

    if (!isValidId(pharmacy_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pharmacy ID is required',
      })
    }

    const pharmacyId = Number(pharmacy_id)

    const { data: pharmacy, error: pharmacyError } =
      await supabaseAdmin
        .from('pharmacies')
        .select('pharmacy_id, name, status')
        .eq('pharmacy_id', pharmacyId)
        .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Medicine request pharmacy lookup error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message: 'Could not verify the selected pharmacy',
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Selected pharmacy was not found',
      })
    }

    if (pharmacy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'The selected pharmacy is not currently active',
      })
    }

    // --------------------------------------------------
    // Validate items
    // --------------------------------------------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required',
      })
    }

    const medicineIds = new Set()
    const normalizedItems = []

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine request item',
        })
      }

      const medicineId = Number(item.medicine_id)
      const requestedQuantity = Number(item.requested_quantity)

      if (!isValidId(medicineId)) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID',
        })
      }

      if (
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Each item must have a requested quantity greater than zero',
        })
      }

      if (medicineIds.has(medicineId)) {
        return res.status(400).json({
          success: false,
          message:
            'The same medicine cannot be added more than once to a request',
        })
      }

      medicineIds.add(medicineId)

      normalizedItems.push({
        medicine_id: medicineId,
        requested_quantity: requestedQuantity,
        available_quantity: 0,
        notes:
          typeof item.notes === 'string' && item.notes.trim()
            ? item.notes.trim()
            : null,
      })
    }

    // --------------------------------------------------
    // Verify medicines
    // --------------------------------------------------

    const { data: medicines, error: medicinesError } =
      await supabaseAdmin
        .from('medicines')
        .select('medicine_id, status')
        .in(
          'medicine_id',
          normalizedItems.map((item) => item.medicine_id)
        )

    if (medicinesError) {
      console.error(
        'Medicine request medicine lookup error:',
        medicinesError
      )

      return res.status(500).json({
        success: false,
        message: 'Could not verify requested medicines',
      })
    }

    const activeMedicineIds = new Set(
      (medicines || [])
        .filter((medicine) => medicine.status === 'ACTIVE')
        .map((medicine) => Number(medicine.medicine_id))
    )

    const invalidMedicine = normalizedItems.find(
      (item) => !activeMedicineIds.has(item.medicine_id)
    )

    if (invalidMedicine) {
      return res.status(400).json({
        success: false,
        message:
          'One or more requested medicines are unavailable or inactive',
      })
    }

    // --------------------------------------------------
    // Create request header
    // --------------------------------------------------

    const cleanNotes =
      typeof notes === 'string' && notes.trim()
        ? notes.trim()
        : null

    const {
      data: request,
      error: requestError,
    } = await supabaseAdmin
      .from('medicine_requests')
      .insert({
        customer_id: Number(customerId),
        pharmacy_id: pharmacyId,
        notes: cleanNotes,
        // status intentionally omitted.
        // PostgreSQL applies PENDING.
      })
      .select(`
        medicine_request_id,
        customer_id,
        pharmacy_id,
        status,
        notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      `)
      .single()

    if (requestError) {
      console.error(
        'Create medicine request error:',
        requestError
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to create medicine request',
      })
    }

    // --------------------------------------------------
    // Create request items
    // --------------------------------------------------

    const requestItems = normalizedItems.map((item) => ({
      medicine_request_id: request.medicine_request_id,
      ...item,
    }))

    const {
      data: createdItems,
      error: itemsError,
    } = await supabaseAdmin
      .from('medicine_request_items')
      .insert(requestItems)
      .select(`
        medicine_request_item_id,
        medicine_request_id,
        medicine_id,
        requested_quantity,
        available_quantity,
        notes,
        created_at,
        updated_at
      `)

    if (itemsError) {
      console.error(
        'Create medicine request items error:',
        itemsError
      )

      // Compensating rollback.
      // Remove the request header if its items could not be created.
      const { error: rollbackError } = await supabaseAdmin
        .from('medicine_requests')
        .delete()
        .eq(
          'medicine_request_id',
          request.medicine_request_id
        )
        .eq('customer_id', Number(customerId))

      if (rollbackError) {
        console.error(
          'Medicine request rollback error:',
          rollbackError
        )
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create medicine request items',
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Medicine request submitted successfully',
      data: {
        ...request,
        medicine_request_items: createdItems || [],
      },
    })
  } catch (error) {
    console.error(
      'Create medicine request server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * GET authenticated customer's medicine requests
 * GET /api/medicine-requests
 */
const getCustomerMedicineRequests = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicine_requests')
      .select(requestColumns)
      .eq('customer_id', Number(customerId))
      .order('created_at', { ascending: false })

    if (error) {
      console.error(
        'Get customer medicine requests error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medicine requests',
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error(
      'Get customer medicine requests server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * GET authenticated customer's medicine request by ID
 * GET /api/medicine-requests/:requestId
 */
const getCustomerMedicineRequestById = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id
    const requestId = Number(req.params.requestId)

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found',
      })
    }

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine request ID',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicine_requests')
      .select(requestColumns)
      .eq('medicine_request_id', requestId)
      .eq('customer_id', Number(customerId))
      .maybeSingle()

    if (error) {
      console.error(
        'Get customer medicine request error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medicine request',
      })
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Medicine request not found',
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(
      'Get customer medicine request server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}


module.exports = {
  // Customer
  createMedicineRequest,
  getCustomerMedicineRequests,
  getCustomerMedicineRequestById,

  // Pharmacy / Super Admin
  getPharmacyMedicineRequests,
  getMedicineRequestById,
  updateMedicineRequestStatus,
}