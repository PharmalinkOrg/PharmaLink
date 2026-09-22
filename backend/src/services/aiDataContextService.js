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
    /^\s*can you check\s+(?:if|whether)\s+/i,
    /^\s*could you check\s+(?:if|whether)\s+/i,
    /^\s*check\s+(?:if|whether)\s+/i,

    /^\s*please\s+/i,
    /^\s*can you\s+/i,
    /^\s*could you\s+/i,
    /^\s*would you\s+/i,

    /^\s*do you have\s+/i,
    /^\s*does any pharmacy have\s+/i,
    /^\s*which pharmacy has\s+/i,
    /^\s*what pharmacy has\s+/i,

    /^\s*where can i find\s+/i,
    /^\s*where can i get\s+/i,

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

  return createContextResult({
    intent,
    dataType: 'MEDICINE_SEARCH',
    data: medicines,
    metadata: {
      searchTerm,
      resultCount: medicines.length,
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
      medicine: medicineInfo,
      pharmacies,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_RESERVATIONS',
        data: reservations,
        metadata: {
          resultCount: reservations.length,
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
          data: reservation,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_RESERVATIONS',
        data: reservations,
        metadata: {
          resultCount: reservations.length,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_PRESCRIPTIONS',
        data: prescriptions,
        metadata: {
          resultCount: prescriptions.length,
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
          data: prescription,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_PRESCRIPTIONS',
        data: prescriptions,
        metadata: {
          resultCount: prescriptions.length,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_MEDICINE_REQUESTS',
        data: requests,
        metadata: {
          resultCount: requests.length,
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
          data: request,
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

      return createContextResult({
        intent,
        dataType: 'CUSTOMER_MEDICINE_REQUESTS',
        data: requests,
        metadata: {
          resultCount: requests.length,
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