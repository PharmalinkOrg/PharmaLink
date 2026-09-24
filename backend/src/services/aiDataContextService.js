const {
  AI_INTENTS,
  detectCustomerIntent,
} = require('./aiIntentService')

const {
  searchMedicines,
  getMedicineInformation,
  searchAvailablePharmacies,
  getCustomerReservations,
  getCustomerReservation,
  getCustomerPrescriptions,
  getCustomerPrescription,
  getCustomerMedicineRequests,
  getCustomerMedicineRequest,
} = require('./aiDataService')

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_CONTEXT_RESULTS = 10

/* ============================================================
   AI CONTEXT SANITIZATION
============================================================ */

/**
 * These helpers define the exact fields that may be sent to
 * the external AI provider.
 *
 * Internal database IDs may still be used by PharmaLink
 * services to perform controlled queries, but unnecessary
 * identifiers are removed before provider context is built.
 */

const sanitizeMedicine = (medicine) => {
  if (!medicine) {
    return null
  }

  return {
    generic_name: medicine.generic_name ?? null,
    brand_name: medicine.brand_name ?? null,
    dosage: medicine.dosage ?? null,
    dosage_form: medicine.dosage_form ?? null,
    description: medicine.description ?? null,
    requires_prescription:
      medicine.requires_prescription ?? null,
    status: medicine.status ?? null,
  }
}

const sanitizePharmacy = (pharmacy) => {
  if (!pharmacy) {
    return null
  }

  return {
    name: pharmacy.name ?? null,
    address: pharmacy.address ?? null,
    contact_number:
      pharmacy.contact_number ?? null,
  }
}

const sanitizeAvailability = (item) => {
  if (!item) {
    return null
  }

  return {
    quantity: item.quantity ?? null,
    unit_price: item.unit_price ?? null,
    inventory_status:
      item.inventory_status ?? null,
    pharmacy: sanitizePharmacy(
      item.pharmacy
    ),
  }
}

const sanitizeReservationItem = (item) => {
  if (!item) {
    return null
  }

  return {
    quantity: item.quantity ?? null,
    unit_price: item.unit_price ?? null,
    medicine: sanitizeMedicine(
      item.medicines
    ),
  }
}

const sanitizeReservation = (reservation) => {
  if (!reservation) {
    return null
  }

  return {
    reservation_id:
      reservation.reservation_id,
    reservation_date:
      reservation.reservation_date ?? null,
    pickup_date:
      reservation.pickup_date ?? null,
    pickup_time:
      reservation.pickup_time ?? null,
    status:
      reservation.status ?? null,
    notes:
      reservation.notes ?? null,
    confirmed_at:
      reservation.confirmed_at ?? null,
    completed_at:
      reservation.completed_at ?? null,
    created_at:
      reservation.created_at ?? null,

    pharmacy: sanitizePharmacy(
      reservation.pharmacies
    ),

    items: Array.isArray(
      reservation.reservation_items
    )
      ? reservation.reservation_items
          .map(sanitizeReservationItem)
          .filter(Boolean)
      : [],
  }
}

const sanitizePrescription = (prescription) => {
  if (!prescription) {
    return null
  }

  return {
    prescription_id:
      prescription.prescription_id,
    prescription_date:
      prescription.prescription_date ?? null,
    status:
      prescription.status ?? null,
    notes:
      prescription.notes ?? null,
    verified_at:
      prescription.verified_at ?? null,
    created_at:
      prescription.created_at ?? null,

    pharmacy: sanitizePharmacy(
      prescription.pharmacies
    ),
  }
}

const sanitizeMedicineRequestItem = (item) => {
  if (!item) {
    return null
  }

  return {
    requested_quantity:
      item.requested_quantity ?? null,
    available_quantity:
      item.available_quantity ?? null,
    notes:
      item.notes ?? null,
    medicine: sanitizeMedicine(
      item.medicines
    ),
  }
}

const sanitizeMedicineRequest = (request) => {
  if (!request) {
    return null
  }

  return {
    medicine_request_id:
      request.medicine_request_id,
    status:
      request.status ?? null,
    notes:
      request.notes ?? null,
    reviewed_at:
      request.reviewed_at ?? null,
    created_at:
      request.created_at ?? null,

    pharmacy: sanitizePharmacy(
      request.pharmacies
    ),

    items: Array.isArray(
      request.medicine_request_items
    )
      ? request.medicine_request_items
          .map(sanitizeMedicineRequestItem)
          .filter(Boolean)
      : [],
  }
}

/* ============================================================
   HELPERS
============================================================ */

/**
 * Removes common conversational phrases from a medicine-related
 * message so the remaining text can be used as a medicine search
 * term.
 *
 * This is intentionally conservative.
 */
const extractMedicineSearchTerm = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  let term = value
    .trim()
    .replace(/\s+/g, ' ')

  /*
   * Remove common conversational prefixes.
   */
  const prefixPatterns = [
    // Search-style requests
    /^\s*help me find\s+/i,
    /^\s*help me search for\s+/i,
    /^\s*help me search\s+/i,
    /^\s*find me\s+/i,
    /^\s*find\s+/i,
    /^\s*search for\s+/i,
    /^\s*search\s+/i,
    /^\s*look for\s+/i,
    /^\s*show me\s+/i,

    // Availability checks
    /^\s*can you check\s+(?:if|whether)\s+/i,
    /^\s*could you check\s+(?:if|whether)\s+/i,
    /^\s*check\s+(?:if|whether)\s+/i,

    // Polite/helper prefixes
    /^\s*please\s+/i,
    /^\s*can you\s+/i,
    /^\s*could you\s+/i,
    /^\s*would you\s+/i,

    // Pharmacy availability
    /^\s*do you have\s+/i,
    /^\s*does any pharmacy have\s+/i,
    /^\s*which pharmacy has\s+/i,
    /^\s*what pharmacy has\s+/i,

    /^\s*where can i find\s+/i,
    /^\s*where can i get\s+/i,

    // Price
    /^\s*how much is\s+/i,
    /^\s*how much does\s+/i,
    /^\s*what is the price of\s+/i,
    /^\s*what's the price of\s+/i,

    /^\s*is there\s+/i,
    /^\s*is\s+/i,
  ]

  for (const pattern of prefixPatterns) {
    term = term.replace(pattern, '')
  }

  /*
   * Remove common availability/price suffixes.
   */
  const suffixPatterns = [
    /\s+available\s+at\s+any\s+pharmacy\s*$/i,
    /\s+available\s+in\s+any\s+pharmacy\s*$/i,
    /\s+available\s+near\s+me\s*$/i,
    /\s+available\s*$/i,

    /\s+in\s+stock\s*$/i,
    /\s+in\s+stock\s+near\s+me\s*$/i,

    /\s+at\s+any\s+pharmacy\s*$/i,
    /\s+in\s+any\s+pharmacy\s*$/i,

    /\s+near\s+me\s*$/i,

    /\s+cost\s*$/i,
    /\s+price\s*$/i,

    /\s+for\s+me\s*$/i,
  ]

  for (const pattern of suffixPatterns) {
    term = term.replace(pattern, '')
  }

  /*
   * Remove remaining helper words that commonly surround a
   * medicine name.
   *
   * Do not aggressively remove ordinary words because medicine
   * brand names can contain multiple words.
   */
  term = term
    .replace(/\bplease\b/gi, ' ')
    .replace(/\bavailability\b/gi, ' ')
    .replace(/\bavailable\b/gi, ' ')
    .replace(/\bin stock\b/gi, ' ')
    .replace(/\bmedicine\b/gi, ' ')
    .replace(/\bmedication\b/gi, ' ')
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  /*
   * Avoid sending an obviously empty or excessively long search
   * expression to the database.
   */
  if (!term) {
    return ''
  }

  return term.slice(0, 100)
}

/**
 * Standard result returned by this service.
 */
const createContextResult = ({
  intent,
  entityId = null,
  dataType = null,
  data = null,
  metadata = {},
}) => {
  let resultState = 'NOT_APPLICABLE'

  if (Array.isArray(data)) {
    resultState =
      data.length > 0
        ? 'RESULTS_FOUND'
        : 'NO_RESULTS'
  } else if (data !== null && data !== undefined) {
    resultState = 'RESULT_FOUND'
  } else if (dataType) {
    resultState = 'NOT_FOUND'
  }

  return {
    intent,
    entityId,
    dataType,
    data,
    metadata: {
      ...metadata,
      resultState,
    },
  }
}

/* ============================================================
   MEDICINE CONTEXT
============================================================ */

const resolveMedicineSearch = async (
  message,
  intent
) => {
  const searchTerm = extractMedicineSearchTerm(message)

  if (!searchTerm) {
    return createContextResult({
      intent,
      dataType: 'MEDICINE_SEARCH',
      data: [],
      metadata: {
        searchTerm: null,
        reason: 'NO_MEDICINE_SEARCH_TERM',
      },
    })
  }

  const medicines = await searchMedicines(
    searchTerm,
    MAX_CONTEXT_RESULTS
  )

  const sanitizedMedicines = medicines
    .map(sanitizeMedicine)
    .filter(Boolean)

  return createContextResult({
    intent,
    dataType: 'MEDICINE_SEARCH',
    data: sanitizedMedicines,
    metadata: {
      searchTerm,
      resultCount:
        sanitizedMedicines.length,
    },
  })
}

const resolveMedicineAvailability = async (
  message,
  intent
) => {
  const searchTerm = extractMedicineSearchTerm(message)

  if (!searchTerm) {
    return createContextResult({
      intent,
      dataType: 'MEDICINE_AVAILABILITY',
      data: [],
      metadata: {
        searchTerm: null,
        reason: 'NO_MEDICINE_SEARCH_TERM',
      },
    })
  }

  /*
   * First resolve the customer's medicine name to controlled
   * PharmaLink medicine records.
   */
  const medicines = await searchMedicines(
    searchTerm,
    5
  )

  if (medicines.length === 0) {
    return createContextResult({
      intent,
      dataType: 'MEDICINE_AVAILABILITY',
      data: [],
      metadata: {
        searchTerm,
        medicineMatches: 0,
      },
    })
  }

  /*
   * Search availability only for medicines that PharmaLink
   * actually returned.
   *
   * Limit to the first few medicine matches so a vague message
   * cannot trigger a large number of inventory queries.
   */
  const selectedMedicines = medicines.slice(0, 3)

  const availabilityResults = []

  for (const medicine of selectedMedicines) {
    const medicineInfo = await getMedicineInformation(
      medicine.medicine_id
    )

    if (!medicineInfo) {
      continue
    }

    const pharmacies = await searchAvailablePharmacies(
      medicine.medicine_id,
      MAX_CONTEXT_RESULTS
    )

    availabilityResults.push({
      medicine:
        sanitizeMedicine(medicineInfo),

      pharmacies: pharmacies
        .map(sanitizeAvailability)
        .filter(Boolean),
    })
  }

  const pharmaciesFound = availabilityResults.reduce(
    (total, item) => {
      return total + (
        Array.isArray(item.pharmacies)
          ? item.pharmacies.length
          : 0
      )
    },
    0
  )

  return createContextResult({
    intent,
    dataType: 'MEDICINE_AVAILABILITY',
    data: availabilityResults,
    metadata: {
      searchTerm,
      medicineMatches: medicines.length,
      medicinesChecked: availabilityResults.length,
      pharmaciesFound,
      availabilityFound: pharmaciesFound > 0,
    },
  })
}

/* ============================================================
   PRIVATE CUSTOMER CONTEXT
============================================================ */

const resolveCustomerData = async ({
  intent,
  entityId,
  customerId,
}) => {
  switch (intent) {
    case AI_INTENTS.RESERVATION_LIST: {
      const reservations =
        await getCustomerReservations(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedReservations =
        reservations
          .map(sanitizeReservation)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_RESERVATIONS',
        data: sanitizedReservations,
        metadata: {
          resultCount:
            sanitizedReservations.length,
        },
      })
    }

    case AI_INTENTS.RESERVATION_STATUS: {
      /*
       * If a specific ID was supplied, ownership is enforced
       * inside aiDataService using BOTH customerId and record ID.
       */
      if (entityId) {
        const reservation =
          await getCustomerReservation(
            customerId,
            entityId
          )

        return createContextResult({
          intent,
          entityId,
          dataType: 'CUSTOMER_RESERVATION',
          data: sanitizeReservation(
            reservation
          ),
          metadata: {
            found: Boolean(reservation),
          },
        })
      }

      /*
       * "What's my reservation status?" without an ID:
       * provide the customer's recent reservations rather than
       * guessing which reservation they meant.
       */
      const reservations =
        await getCustomerReservations(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedReservations =
        reservations
          .map(sanitizeReservation)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_RESERVATIONS',
        data: sanitizedReservations,
        metadata: {
          resultCount: sanitizedReservations.length,
          specificReservationRequested: false,
        },
      })
    }

    case AI_INTENTS.PRESCRIPTION_LIST: {
      const prescriptions =
        await getCustomerPrescriptions(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedPrescriptions =
        prescriptions
          .map(sanitizePrescription)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_PRESCRIPTIONS',
        data: sanitizedPrescriptions,
        metadata: {
          resultCount: sanitizedPrescriptions.length,
        },
      })
    }

    case AI_INTENTS.PRESCRIPTION_STATUS: {
      if (entityId) {
        const prescription =
          await getCustomerPrescription(
            customerId,
            entityId
          )

        return createContextResult({
          intent,
          entityId,
          dataType: 'CUSTOMER_PRESCRIPTION',
          data: sanitizePrescription(
            prescription
          ),
          metadata: {
            found: Boolean(prescription),
          },
        })
      }

      const prescriptions =
        await getCustomerPrescriptions(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedPrescriptions =
        prescriptions
          .map(sanitizePrescription)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_PRESCRIPTIONS',
        data: sanitizedPrescriptions,
        metadata: {
          resultCount: sanitizedPrescriptions.length,
          specificPrescriptionRequested: false,
        },
      })
    }

    case AI_INTENTS.MEDICINE_REQUEST_LIST: {
      const requests =
        await getCustomerMedicineRequests(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedRequests =
        requests
          .map(sanitizeMedicineRequest)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_MEDICINE_REQUESTS',
        data: sanitizedRequests,
        metadata: {
          resultCount: sanitizedRequests.length,
        },
      })
    }

    case AI_INTENTS.MEDICINE_REQUEST_STATUS: {
      if (entityId) {
        const request =
          await getCustomerMedicineRequest(
            customerId,
            entityId
          )

        return createContextResult({
          intent,
          entityId,
          dataType: 'CUSTOMER_MEDICINE_REQUEST',
          data: sanitizeMedicineRequest(
            request
          ),
          metadata: {
            found: Boolean(request),
          },
        })
      }

      const requests =
        await getCustomerMedicineRequests(
          customerId,
          MAX_CONTEXT_RESULTS
        )

      const sanitizedRequests =
        requests
          .map(sanitizeMedicineRequest)
          .filter(Boolean)

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_MEDICINE_REQUESTS',
        data: sanitizedRequests,
        metadata: {
          resultCount: sanitizedRequests.length,
          specificRequestRequested: false,
        },
      })
    }

    default:
      return createContextResult({
        intent,
        dataType: null,
        data: null,
      })
  }
}

/* ============================================================
   MAIN RESOLVER
============================================================ */

/**
 * Resolve approved PharmaLink data for a customer message.
 *
 * SECURITY:
 * customerId must come from req.pharmaUser.user_id.
 *
 * This function does not accept a customer ID extracted from
 * the chat message.
 */
const resolveCustomerDataContext = async ({
  message,
  customerId,
}) => {
  const detected = detectCustomerIntent(message)

  const {
    intent,
    entityId,
  } = detected

  switch (intent) {
    case AI_INTENTS.MEDICINE_SEARCH:
      return resolveMedicineSearch(
        message,
        intent
      )

    case AI_INTENTS.MEDICINE_AVAILABILITY:
      return resolveMedicineAvailability(
        message,
        intent
      )

    case AI_INTENTS.RESERVATION_LIST:
    case AI_INTENTS.RESERVATION_STATUS:
    case AI_INTENTS.PRESCRIPTION_LIST:
    case AI_INTENTS.PRESCRIPTION_STATUS:
    case AI_INTENTS.MEDICINE_REQUEST_LIST:
    case AI_INTENTS.MEDICINE_REQUEST_STATUS:
      /*
       * Do not attempt private-data access without a valid
       * authenticated customer ID.
       */
      if (
        !Number.isInteger(Number(customerId)) ||
        Number(customerId) <= 0
      ) {
        const error = new Error(
          'Authenticated customer is required for private AI data'
        )

        error.code = 'AI_CUSTOMER_REQUIRED'

        throw error
      }

      return resolveCustomerData({
        intent,
        entityId,
        customerId: Number(customerId),
      })

    case AI_INTENTS.GENERAL:
    default:
      /*
       * General conversation does not trigger live database
       * access.
       */
      return createContextResult({
        intent: AI_INTENTS.GENERAL,
        dataType: null,
        data: null,
        metadata: {
          databaseAccessed: false,
        },
      })
  }
}

module.exports = {
  extractMedicineSearchTerm,
  resolveCustomerDataContext,
}