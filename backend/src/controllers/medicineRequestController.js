const supabaseAdmin = require('../config/supabaseAdmin')

// ============================================================
// SELECTS
// ============================================================

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

  users:customer_id (
    first_name,
    last_name,
    email,
    phone
  ),

  medicine_request_items (
    medicine_request_item_id,
    medicine_id,
    medicine_name,
    brand_name,
    dosage,
    dosage_form,
    requested_quantity,
    available_quantity,
    notes,

    medicines (
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      requires_prescription
    )
  ),

  medicine_request_responses (
    response_id,
    pharmacy_id,
    medicine_id,
    status,
    available_quantity,
    unit_price,
    notes,
    responded_by,
    responded_at,
    created_at,
    updated_at,

    pharmacies (
      pharmacy_id,
      name,
      address,
      contact_number,
      email,
      status,
      latitude,
      longitude
    ),

    medicines (
      medicine_id,
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      requires_prescription
    )
  )
`

// ============================================================
// CONSTANTS
// ============================================================

const RESPONSE_STATUSES = [
  'AVAILABLE',
  'PARTIALLY_AVAILABLE',
  'UNAVAILABLE',
]

const REQUEST_STATUSES = [
  'OPEN',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED',
]

// ============================================================
// HELPERS
// ============================================================

const isValidId = (value) => {
  const number = Number(value)

  return Number.isInteger(number) && number > 0
}

const cleanOptionalText = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed || null
}

const normalizeRequestedItem = (item) => {
  const requestedQuantity = Number(item?.requested_quantity)

  if (
    !Number.isInteger(requestedQuantity) ||
    requestedQuantity <= 0
  ) {
    return {
      error:
        'Each item must have a requested quantity greater than zero',
    }
  }

  const hasMedicineId = isValidId(item?.medicine_id)

  const medicineName = cleanOptionalText(item?.medicine_name)

  // Customer may:
  // 1. select an existing PharmaLink medicine
  // OR
  // 2. manually enter a medicine name.
  if (!hasMedicineId && !medicineName) {
    return {
      error:
        'Each request item must contain either a medicine ID or medicine name',
    }
  }

  return {
    value: {
      medicine_id: hasMedicineId
        ? Number(item.medicine_id)
        : null,

      medicine_name: medicineName,

      brand_name: cleanOptionalText(item?.brand_name),

      dosage: cleanOptionalText(item?.dosage),

      dosage_form: cleanOptionalText(item?.dosage_form),

      requested_quantity: requestedQuantity,

      // Legacy column retained temporarily.
      // Pharmacy availability now belongs in
      // medicine_request_responses.
      available_quantity: 0,

      notes: cleanOptionalText(item?.notes),
    },
  }
}

// ============================================================
// CUSTOMER
// CREATE MEDICINE REQUEST
// POST /api/medicine-requests
// ============================================================

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

    const { notes, items } = req.body || {}

    // --------------------------------------------------------
    // Validate items
    // --------------------------------------------------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required',
      })
    }

    const normalizedItems = []

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine request item',
        })
      }

      const normalized = normalizeRequestedItem(item)

      if (normalized.error) {
        return res.status(400).json({
          success: false,
          message: normalized.error,
        })
      }

      normalizedItems.push(normalized.value)
    }

    // --------------------------------------------------------
    // Prevent duplicate selected medicine IDs
    // --------------------------------------------------------

    const selectedMedicineIds = normalizedItems
      .filter((item) => item.medicine_id)
      .map((item) => item.medicine_id)

    if (
      new Set(selectedMedicineIds).size !==
      selectedMedicineIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The same medicine cannot be added more than once to a request',
      })
    }

    // --------------------------------------------------------
    // Verify selected existing medicines
    // --------------------------------------------------------

    if (selectedMedicineIds.length > 0) {
      const { data: medicines, error: medicinesError } =
        await supabaseAdmin
          .from('medicines')
          .select(`
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form,
            status
          `)
          .in('medicine_id', selectedMedicineIds)

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

      const medicineMap = new Map(
        (medicines || []).map((medicine) => [
          Number(medicine.medicine_id),
          medicine,
        ])
      )

      for (const item of normalizedItems) {
        if (!item.medicine_id) {
          continue
        }

        const medicine = medicineMap.get(item.medicine_id)

        if (!medicine || medicine.status !== 'ACTIVE') {
          return res.status(400).json({
            success: false,
            message:
              'One or more selected medicines are unavailable or inactive',
          })
        }

        // Store a snapshot of the selected medicine's information.
        // This means the request remains understandable even if
        // the pharmacy medicine record changes later.
        item.medicine_name =
          item.medicine_name ||
          cleanOptionalText(medicine.generic_name)

        item.brand_name =
          item.brand_name ||
          cleanOptionalText(medicine.brand_name)

        item.dosage =
          item.dosage ||
          cleanOptionalText(medicine.dosage)

        item.dosage_form =
          item.dosage_form ||
          cleanOptionalText(medicine.dosage_form)
      }
    }

    // --------------------------------------------------------
    // Create request header
    // --------------------------------------------------------

    const cleanNotes = cleanOptionalText(notes)

    const {
      data: request,
      error: requestError,
    } = await supabaseAdmin
      .from('medicine_requests')
      .insert({
        customer_id: Number(customerId),

        // Broadcast request:
        // it no longer belongs to one pharmacy.
        pharmacy_id: null,

        status: 'OPEN',

        notes: cleanNotes,

        // Legacy review columns remain null.
        reviewed_by: null,
        reviewed_at: null,
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
        error: requestError.message,
      })
    }

    // --------------------------------------------------------
    // Create request items
    // --------------------------------------------------------

    const requestItems = normalizedItems.map((item) => ({
      medicine_request_id:
        request.medicine_request_id,

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
        medicine_name,
        brand_name,
        dosage,
        dosage_form,
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
      const { error: rollbackError } =
        await supabaseAdmin
          .from('medicine_requests')
          .delete()
          .eq(
            'medicine_request_id',
            request.medicine_request_id
          )
          .eq(
            'customer_id',
            Number(customerId)
          )

      if (rollbackError) {
        console.error(
          'Medicine request rollback error:',
          rollbackError
        )
      }

      return res.status(500).json({
        success: false,
        message:
          'Failed to create medicine request items',
        error: itemsError.message,
      })
    }

    return res.status(201).json({
      success: true,

      message:
        'Medicine request submitted to PharmaLink partner pharmacies',

      data: {
        ...request,
        medicine_request_items:
          createdItems || [],
        medicine_request_responses: [],
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
      error: error.message,
    })
  }
}

// ============================================================
// CUSTOMER
// GET MY MEDICINE REQUESTS
// GET /api/medicine-requests
// ============================================================

const getCustomerMedicineRequests = async (
  req,
  res
) => {
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
      .eq(
        'customer_id',
        Number(customerId)
      )
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Get customer medicine requests error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve medicine requests',
        error: error.message,
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
      error: error.message,
    })
  }
}

// ============================================================
// CUSTOMER
// GET MY MEDICINE REQUEST BY ID
// GET /api/medicine-requests/:requestId
// ============================================================

const getCustomerMedicineRequestById = async (
  req,
  res
) => {
  try {
    const customerId = req.pharmaUser?.user_id

    const requestId =
      Number(req.params.requestId)

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
      .eq(
        'medicine_request_id',
        requestId
      )
      .eq(
        'customer_id',
        Number(customerId)
      )
      .maybeSingle()

    if (error) {
      console.error(
        'Get customer medicine request error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve medicine request',
        error: error.message,
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
      error: error.message,
    })
  }
}

// ============================================================
// PHARMACY ADMIN / SUPER ADMIN
// GET OPEN MEDICINE REQUESTS
// GET /api/medicine-requests/pharmacy
// ============================================================

const getPharmacyMedicineRequests = async (
  req,
  res
) => {
  try {
    const role = req.pharmaUser?.role

    if (
      role !== 'PHARMACY_ADMIN' &&
      role !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have access to medicine requests',
      })
    }

    // --------------------------------------------------------
    // SUPER_ADMIN
    //
    // Can inspect all requests and responses.
    // --------------------------------------------------------

    if (role === 'SUPER_ADMIN') {
      const { data, error } =
        await supabaseAdmin
          .from('medicine_requests')
          .select(requestColumns)
          .order('created_at', {
            ascending: false,
          })

      if (error) {
        console.error(
          'Get medicine requests error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to retrieve medicine requests',
          error: error.message,
        })
      }

      return res.status(200).json({
        success: true,
        data: data || [],
      })
    }

    // --------------------------------------------------------
    // PHARMACY ADMIN
    //
    // Broadcast model:
    // every ACTIVE partner pharmacy can see OPEN requests.
    //
    // It can also see requests it already responded to.
    // --------------------------------------------------------

    const pharmacyId =
      Number(req.pharmaUser?.pharmacy_id)

    if (!isValidId(pharmacyId)) {
      return res.status(403).json({
        success: false,
        message:
          'Pharmacy administrator is not assigned to a pharmacy',
      })
    }

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        pharmacy_id,
        status
      `)
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Pharmacy verification error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message:
          'Could not verify pharmacy access',
        error: pharmacyError.message,
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Assigned pharmacy was not found',
      })
    }

    if (pharmacy.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message:
          'Only active partner pharmacies can access medicine requests',
      })
    }

    // Get requests that are still open.
    const {
      data: openRequests,
      error: openError,
    } = await supabaseAdmin
      .from('medicine_requests')
      .select(requestColumns)
      .eq('status', 'OPEN')
      .order('created_at', {
        ascending: false,
      })

    if (openError) {
      console.error(
        'Get open medicine requests error:',
        openError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve medicine requests',
        error: openError.message,
      })
    }

    // Get request IDs this pharmacy already responded to.
    const {
      data: pharmacyResponses,
      error: responseError,
    } = await supabaseAdmin
      .from('medicine_request_responses')
      .select('medicine_request_id')
      .eq('pharmacy_id', pharmacyId)

    if (responseError) {
      console.error(
        'Get pharmacy responses error:',
        responseError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacy responses',
        error: responseError.message,
      })
    }

    const respondedRequestIds = [
      ...new Set(
        (pharmacyResponses || []).map(
          (response) =>
            Number(response.medicine_request_id)
        )
      ),
    ]

    let respondedRequests = []

    if (respondedRequestIds.length > 0) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from('medicine_requests')
        .select(requestColumns)
        .in(
          'medicine_request_id',
          respondedRequestIds
        )
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'Get responded medicine requests error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to retrieve responded requests',
          error: error.message,
        })
      }

      respondedRequests = data || []
    }

    // Merge and remove duplicates.
    const requestMap = new Map()

    for (const request of [
      ...(openRequests || []),
      ...respondedRequests,
    ]) {
      requestMap.set(
        Number(request.medicine_request_id),
        request
      )
    }

    const data = Array.from(
      requestMap.values()
    ).sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(
      'Get pharmacy medicine requests server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

// ============================================================
// PHARMACY ADMIN / SUPER ADMIN
// GET REQUEST BY ID
// GET /api/medicine-requests/pharmacy/:requestId
// ============================================================

const getMedicineRequestById = async (
  req,
  res
) => {
  try {
    const requestId =
      Number(req.params.requestId)

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine request ID',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicine_requests')
      .select(requestColumns)
      .eq(
        'medicine_request_id',
        requestId
      )
      .maybeSingle()

    if (error) {
      console.error(
        'Get medicine request error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve medicine request',
        error: error.message,
      })
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Medicine request not found',
      })
    }

    if (
      req.pharmaUser.role ===
      'PHARMACY_ADMIN'
    ) {
      const pharmacyId =
        Number(req.pharmaUser.pharmacy_id)

      if (!isValidId(pharmacyId)) {
        return res.status(403).json({
          success: false,
          message:
            'Pharmacy administrator is not assigned to a pharmacy',
        })
      }

      // Open requests are visible to all active partner
      // pharmacies. Closed requests remain visible only when
      // this pharmacy previously responded.
      if (data.status !== 'OPEN') {
        const { data: response } =
          await supabaseAdmin
            .from(
              'medicine_request_responses'
            )
            .select('response_id')
            .eq(
              'medicine_request_id',
              requestId
            )
            .eq(
              'pharmacy_id',
              pharmacyId
            )
            .maybeSingle()

        if (!response) {
          return res.status(403).json({
            success: false,
            message:
              'You do not have access to this medicine request',
          })
        }
      }
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(
      'Get medicine request server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

// ============================================================
// PHARMACY ADMIN
// RESPOND TO MEDICINE REQUEST
// POST /api/medicine-requests/:requestId/respond
// ============================================================

const respondToMedicineRequest = async (
  req,
  res
) => {
  try {
    const requestId =
      Number(req.params.requestId)

    const pharmacyId =
      Number(req.pharmaUser?.pharmacy_id)

    const responderId =
      Number(req.pharmaUser?.user_id)

    if (
      req.pharmaUser?.role !==
      'PHARMACY_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only pharmacy administrators can respond to medicine requests',
      })
    }

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine request ID',
      })
    }

    if (!isValidId(pharmacyId)) {
      return res.status(403).json({
        success: false,
        message:
          'Pharmacy administrator is not assigned to a pharmacy',
      })
    }

    const {
      status,
      available_quantity,
      medicine_id,
      unit_price,
      notes,
    } = req.body || {}

    // --------------------------------------------------------
    // Validate response status
    // --------------------------------------------------------

    if (
      !RESPONSE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be AVAILABLE, PARTIALLY_AVAILABLE, or UNAVAILABLE',
      })
    }

    // --------------------------------------------------------
    // Validate quantity
    // --------------------------------------------------------

    const availableQuantity =
      Number(available_quantity ?? 0)

    if (
      !Number.isInteger(availableQuantity) ||
      availableQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Available quantity must be a non-negative integer',
      })
    }

    if (
      status === 'AVAILABLE' &&
      availableQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Available responses must include an available quantity greater than zero',
      })
    }

    if (
      status === 'PARTIALLY_AVAILABLE' &&
      availableQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Partially available responses must include an available quantity greater than zero',
      })
    }

    if (
      status === 'UNAVAILABLE' &&
      availableQuantity !== 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unavailable responses must have an available quantity of zero',
      })
    }

    // --------------------------------------------------------
    // Validate price
    // --------------------------------------------------------

    let unitPrice = null

    if (
      unit_price !== undefined &&
      unit_price !== null &&
      unit_price !== ''
    ) {
      unitPrice = Number(unit_price)

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Unit price must be a valid non-negative number',
        })
      }
    }

    // --------------------------------------------------------
    // Verify request
    // --------------------------------------------------------

    const {
      data: request,
      error: requestError,
    } = await supabaseAdmin
      .from('medicine_requests')
      .select(`
        medicine_request_id,
        customer_id,
        status
      `)
      .eq(
        'medicine_request_id',
        requestId
      )
      .maybeSingle()

    if (requestError) {
      console.error(
        'Medicine request lookup error:',
        requestError
      )

      return res.status(500).json({
        success: false,
        message:
          'Could not verify medicine request',
        error: requestError.message,
      })
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Medicine request not found',
      })
    }

    if (request.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message:
          'This medicine request is no longer accepting pharmacy responses',
      })
    }

    // --------------------------------------------------------
    // Verify pharmacy
    // --------------------------------------------------------

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        pharmacy_id,
        status
      `)
      .eq(
        'pharmacy_id',
        pharmacyId
      )
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Pharmacy lookup error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message:
          'Could not verify pharmacy',
        error: pharmacyError.message,
      })
    }

    if (
      !pharmacy ||
      pharmacy.status !== 'ACTIVE'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only active partner pharmacies can respond',
      })
    }

    // --------------------------------------------------------
    // Optional pharmacy-owned medicine
    // --------------------------------------------------------

    let medicineId = null

    if (
      medicine_id !== undefined &&
      medicine_id !== null &&
      medicine_id !== ''
    ) {
      if (!isValidId(medicine_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine ID',
        })
      }

      medicineId = Number(medicine_id)

      const {
        data: pharmacyMedicine,
        error: medicineError,
      } = await supabaseAdmin
        .from('medicines')
        .select(`
          medicine_id,
          pharmacy_id,
          status
        `)
        .eq(
          'medicine_id',
          medicineId
        )
        .maybeSingle()

      if (medicineError) {
        console.error(
          'Pharmacy medicine lookup error:',
          medicineError
        )

        return res.status(500).json({
          success: false,
          message:
            'Could not verify pharmacy medicine',
          error: medicineError.message,
        })
      }

      if (
        !pharmacyMedicine ||
        Number(
          pharmacyMedicine.pharmacy_id
        ) !== pharmacyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The selected medicine does not belong to this pharmacy',
        })
      }

      if (
        pharmacyMedicine.status !== 'ACTIVE'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The selected pharmacy medicine is inactive',
        })
      }
    }

    // --------------------------------------------------------
    // Create/update pharmacy response
    // --------------------------------------------------------
    //
    // UNIQUE(medicine_request_id, pharmacy_id) means one
    // response per pharmacy. Upsert lets the pharmacy correct
    // its response while the request remains OPEN.
    // --------------------------------------------------------

    const responsePayload = {
      medicine_request_id: requestId,
      pharmacy_id: pharmacyId,
      medicine_id: medicineId,
      status,
      available_quantity:
        availableQuantity,
      unit_price: unitPrice,
      notes: cleanOptionalText(notes),
      responded_by: responderId,
      responded_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    }

    const {
      data: response,
      error: responseError,
    } = await supabaseAdmin
      .from('medicine_request_responses')
      .upsert(
        responsePayload,
        {
          onConflict:
            'medicine_request_id,pharmacy_id',
        }
      )
      .select(`
        response_id,
        medicine_request_id,
        pharmacy_id,
        medicine_id,
        status,
        available_quantity,
        unit_price,
        notes,
        responded_by,
        responded_at,
        created_at,
        updated_at,

        pharmacies (
          pharmacy_id,
          name,
          address,
          contact_number,
          email,
          latitude,
          longitude
        ),

        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form,
          requires_prescription
        )
      `)
      .single()

    if (responseError) {
      console.error(
        'Respond to medicine request error:',
        responseError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to save pharmacy response',
        error: responseError.message,
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Medicine request response saved successfully',
      data: response,
    })
  } catch (error) {
    console.error(
      'Respond to medicine request server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

// ============================================================
// CUSTOMER
// CANCEL REQUEST
// PATCH /api/medicine-requests/:requestId/cancel
// ============================================================

const cancelMedicineRequest = async (
  req,
  res
) => {
  try {
    const customerId =
      Number(req.pharmaUser?.user_id)

    const requestId =
      Number(req.params.requestId)

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine request ID',
      })
    }

    const {
      data: request,
      error: findError,
    } = await supabaseAdmin
      .from('medicine_requests')
      .select(`
        medicine_request_id,
        customer_id,
        status
      `)
      .eq(
        'medicine_request_id',
        requestId
      )
      .eq(
        'customer_id',
        customerId
      )
      .maybeSingle()

    if (findError) {
      console.error(
        'Cancel medicine request lookup error:',
        findError
      )

      return res.status(500).json({
        success: false,
        message:
          'Could not verify medicine request',
        error: findError.message,
      })
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Medicine request not found',
      })
    }

    if (request.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message:
          'Only open medicine requests can be cancelled',
      })
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('medicine_requests')
      .update({
        status: 'CANCELLED',
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'medicine_request_id',
        requestId
      )
      .eq(
        'customer_id',
        customerId
      )
      .select(requestColumns)
      .single()

    if (error) {
      console.error(
        'Cancel medicine request error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to cancel medicine request',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Medicine request cancelled successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Cancel medicine request server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

// ============================================================
// SUPER ADMIN
// UPDATE OVERALL REQUEST STATUS
//
// This replaces the OLD pharmacy status endpoint.
// Pharmacy admins respond through /respond instead.
// ============================================================

const updateMedicineRequestStatus = async (
  req,
  res
) => {
  try {
    const requestId =
      Number(req.params.requestId)

    const { status } = req.body || {}

    if (
      req.pharmaUser?.role !==
      'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only super administrators can directly change the overall request status',
      })
    }

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine request ID',
      })
    }

    if (
      !REQUEST_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request status',
      })
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('medicine_requests')
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'medicine_request_id',
        requestId
      )
      .select(requestColumns)
      .single()

    if (error) {
      console.error(
        'Update medicine request status error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to update medicine request status',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Medicine request status updated successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Update medicine request status server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Customer
  createMedicineRequest,
  getCustomerMedicineRequests,
  getCustomerMedicineRequestById,
  cancelMedicineRequest,

  // Pharmacy / Super Admin
  getPharmacyMedicineRequests,
  getMedicineRequestById,
  respondToMedicineRequest,

  // Super Admin
  updateMedicineRequestStatus,
}