const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_MEDICINE_LIMIT = 10
const MAX_MEDICINE_LIMIT = 20

/* ============================================================
   HELPERS
============================================================ */

const isValidId = (value) => {
  const number = Number(value)

  return Number.isInteger(number) && number > 0
}

const getSafeLimit = (
  limit,
  defaultLimit = DEFAULT_MEDICINE_LIMIT
) => {
  const parsedLimit = Number(limit)

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return defaultLimit
  }

  return Math.min(parsedLimit, MAX_MEDICINE_LIMIT)
}

/**
 * Prepare customer search text before it is used in a
 * Supabase/PostgREST filter.
 */
const normalizeSearchTerm = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100)
}

/* ============================================================
   SEARCH MEDICINES
============================================================ */

/**
 * Search active medicines using generic name or brand name.
 *
 * READ ONLY.
 *
 * This function does not access customer-specific information.
 */
const searchMedicines = async (
  searchTerm,
  limit = DEFAULT_MEDICINE_LIMIT
) => {
  const term = normalizeSearchTerm(searchTerm)

  if (!term) {
    return []
  }

  const safeLimit = getSafeLimit(limit)

  /*
   * Remove characters that could interfere with the
   * PostgREST .or() filter expression.
   */
  const safeSearchTerm = term.replace(/[,%()]/g, ' ').trim()

  if (!safeSearchTerm) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select(`
      medicine_id,
      pharmacy_id,
      category_id,
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      description,
      requires_prescription,
      status
    `)
    .eq('status', 'ACTIVE')
    .or(
      `generic_name.ilike.%${safeSearchTerm}%,brand_name.ilike.%${safeSearchTerm}%`
    )
    .limit(safeLimit)

  if (error) {
    console.error('AI medicine search error:', error)

    const serviceError = new Error(
      'Failed to search PharmaLink medicines'
    )

    serviceError.code = 'AI_MEDICINE_SEARCH_ERROR'

    throw serviceError
  }

  return data || []
}

/* ============================================================
   GET MEDICINE INFORMATION
============================================================ */

/**
 * Retrieve verified information for one active medicine.
 *
 * READ ONLY.
 *
 * Returns null when the medicine does not exist or is inactive.
 */
const getMedicineInformation = async (medicineId) => {
  if (!isValidId(medicineId)) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select(`
      medicine_id,
      pharmacy_id,
      category_id,
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      description,
      requires_prescription,
      status
    `)
    .eq('medicine_id', Number(medicineId))
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (error) {
    console.error(
      'AI medicine information error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve PharmaLink medicine information'
    )

    serviceError.code = 'AI_MEDICINE_FETCH_ERROR'

    throw serviceError
  }

  return data || null
}

/* ============================================================
   SEARCH AVAILABLE PHARMACIES
============================================================ */

/**
 * Find pharmacies with positive inventory for a medicine.
 *
 * READ ONLY.
 *
 * Only AVAILABLE and LOW_STOCK inventory is returned.
 * Only ACTIVE pharmacies are returned.
 */
const searchAvailablePharmacies = async (
  medicineId,
  limit = DEFAULT_MEDICINE_LIMIT
) => {
  if (!isValidId(medicineId)) {
    return []
  }

  const safeLimit = getSafeLimit(limit)

  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select(`
      inventory_id,
      pharmacy_id,
      medicine_id,
      quantity,
      unit_price,
      status,

      pharmacies (
        pharmacy_id,
        name,
        address,
        contact_number,
        status
      )
    `)
    .eq('medicine_id', Number(medicineId))
    .in('status', ['AVAILABLE', 'LOW_STOCK'])
    .gt('quantity', 0)
    .eq('pharmacies.status', 'ACTIVE')
    .order('quantity', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error(
      'AI pharmacy availability search error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve pharmacy availability'
    )

    serviceError.code = 'AI_PHARMACY_AVAILABILITY_ERROR'

    throw serviceError
  }

  /*
   * Defensive filtering.
   *
   * Supabase embedded relationship filtering behavior can
   * otherwise leave a result with a null pharmacy relation.
   */
  return (data || [])
    .filter((item) => item.pharmacies)
    .map((item) => ({
      inventory_id: item.inventory_id,
      pharmacy_id: item.pharmacy_id,
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inventory_status: item.status,

      pharmacy: {
        pharmacy_id: item.pharmacies.pharmacy_id,
        name: item.pharmacies.name,
        address: item.pharmacies.address,
        contact_number: item.pharmacies.contact_number,
      },
    }))
}

/* ============================================================
   CUSTOMER RESERVATIONS
============================================================ */

/**
 * Get recent reservations belonging to one authenticated customer.
 *
 * IMPORTANT:
 * customerId must come from req.pharmaUser.user_id in the
 * calling controller. Never accept a customer ID generated
 * by Gemini or supplied in the customer's chat message.
 *
 * READ ONLY.
 */
const getCustomerReservations = async (
  customerId,
  limit = 10
) => {
  if (!isValidId(customerId)) {
    return []
  }

  const safeLimit = getSafeLimit(limit, 10)

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select(`
      reservation_id,
      pharmacy_id,
      reservation_date,
      pickup_date,
      pickup_time,
      status,
      notes,
      confirmed_at,
      completed_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      ),

      reservation_items (
        reservation_item_id,
        medicine_id,
        quantity,
        unit_price,

        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form
        )
      )
    `)
    .eq('customer_id', Number(customerId))
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error(
      'AI customer reservations error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer reservations'
    )

    serviceError.code = 'AI_RESERVATIONS_FETCH_ERROR'

    throw serviceError
  }

  return data || []
}

/**
 * Get one reservation only when it belongs to the
 * authenticated customer.
 *
 * READ ONLY.
 */
const getCustomerReservation = async (
  customerId,
  reservationId
) => {
  if (
    !isValidId(customerId) ||
    !isValidId(reservationId)
  ) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select(`
      reservation_id,
      pharmacy_id,
      reservation_date,
      pickup_date,
      pickup_time,
      status,
      notes,
      confirmed_at,
      completed_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      ),

      reservation_items (
        reservation_item_id,
        medicine_id,
        quantity,
        unit_price,

        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form
        )
      )
    `)
    .eq('reservation_id', Number(reservationId))
    .eq('customer_id', Number(customerId))
    .maybeSingle()

  if (error) {
    console.error(
      'AI customer reservation error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer reservation'
    )

    serviceError.code = 'AI_RESERVATION_FETCH_ERROR'

    throw serviceError
  }

  return data || null
}

/* ============================================================
   CUSTOMER PRESCRIPTIONS
============================================================ */

const getCustomerPrescriptions = async (
  customerId,
  limit = 10
) => {
  if (!isValidId(customerId)) {
    return []
  }

  const safeLimit = getSafeLimit(limit, 10)

  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      prescription_id,
      pharmacy_id,
      prescription_date,
      status,
      notes,
      verified_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      )
    `)
    .eq('customer_id', Number(customerId))
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error(
      'AI customer prescriptions error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer prescriptions'
    )

    serviceError.code = 'AI_PRESCRIPTIONS_FETCH_ERROR'

    throw serviceError
  }

  return data || []
}

const getCustomerPrescription = async (
  customerId,
  prescriptionId
) => {
  if (
    !isValidId(customerId) ||
    !isValidId(prescriptionId)
  ) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      prescription_id,
      pharmacy_id,
      prescription_date,
      status,
      notes,
      verified_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      )
    `)
    .eq('prescription_id', Number(prescriptionId))
    .eq('customer_id', Number(customerId))
    .maybeSingle()

  if (error) {
    console.error(
      'AI customer prescription error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer prescription'
    )

    serviceError.code = 'AI_PRESCRIPTION_FETCH_ERROR'

    throw serviceError
  }

  return data || null
}

/* ============================================================
   CUSTOMER MEDICINE REQUESTS
============================================================ */

/**
 * Get recent medicine requests belonging to one
 * authenticated customer.
 *
 * READ ONLY.
 */
const getCustomerMedicineRequests = async (
  customerId,
  limit = 10
) => {
  if (!isValidId(customerId)) {
    return []
  }

  const safeLimit = getSafeLimit(limit, 10)

  const { data, error } = await supabaseAdmin
    .from('medicine_requests')
    .select(`
      medicine_request_id,
      pharmacy_id,
      status,
      notes,
      reviewed_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      ),

      medicine_request_items (
        medicine_request_item_id,
        medicine_id,
        requested_quantity,
        available_quantity,
        notes,

        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form
        )
      )
    `)
    .eq('customer_id', Number(customerId))
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error(
      'AI customer medicine requests error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer medicine requests'
    )

    serviceError.code =
      'AI_MEDICINE_REQUESTS_FETCH_ERROR'

    throw serviceError
  }

  return data || []
}

/**
 * Get one medicine request only when it belongs to
 * the authenticated customer.
 *
 * READ ONLY.
 */
const getCustomerMedicineRequest = async (
  customerId,
  requestId
) => {
  if (
    !isValidId(customerId) ||
    !isValidId(requestId)
  ) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('medicine_requests')
    .select(`
      medicine_request_id,
      pharmacy_id,
      status,
      notes,
      reviewed_at,
      created_at,

      pharmacies (
        pharmacy_id,
        name,
        address
      ),

      medicine_request_items (
        medicine_request_item_id,
        medicine_id,
        requested_quantity,
        available_quantity,
        notes,

        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form
        )
      )
    `)
    .eq('medicine_request_id', Number(requestId))
    .eq('customer_id', Number(customerId))
    .maybeSingle()

  if (error) {
    console.error(
      'AI customer medicine request error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve customer medicine request'
    )

    serviceError.code =
      'AI_MEDICINE_REQUEST_FETCH_ERROR'

    throw serviceError
  }

  return data || null
}

module.exports = {
  // Medicine / availability
  searchMedicines,
  getMedicineInformation,
  searchAvailablePharmacies,

  // Customer reservations
  getCustomerReservations,
  getCustomerReservation,

  // Customer prescriptions
  getCustomerPrescriptions,
  getCustomerPrescription,

  // Customer medicine requests
  getCustomerMedicineRequests,
  getCustomerMedicineRequest,
}