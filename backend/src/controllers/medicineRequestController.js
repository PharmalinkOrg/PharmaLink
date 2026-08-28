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

module.exports = {
  getPharmacyMedicineRequests,
  getMedicineRequestById,
  updateMedicineRequestStatus,
}