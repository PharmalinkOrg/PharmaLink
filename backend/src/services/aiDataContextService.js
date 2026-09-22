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

  const removablePhrases = [
    /\bdo you have\b/gi,
    /\bdoes any pharmacy have\b/gi,
    /\bwhich pharmacy has\b/gi,
    /\bwhat pharmacy has\b/gi,
    /\bwhere can i find\b/gi,
    /\bwhere can i get\b/gi,
    /\bis there\b/gi,

    /\bis available\b/gi,
    /\bavailable\b/gi,
    /\bavailability\b/gi,
    /\bin stock\b/gi,
    /\bstock\b/gi,

    /\bhow much is\b/gi,
    /\bhow much does\b/gi,
    /\bhow much\b/gi,
    /\bwhat is the price of\b/gi,
    /\bwhat's the price of\b/gi,
    /\bprice of\b/gi,
    /\bprice\b/gi,

    /\bmedicine\b/gi,
    /\bmedication\b/gi,

    /\bplease\b/gi,
    /\bfor me\b/gi,
  ]

  for (const pattern of removablePhrases) {
    term = term.replace(pattern, ' ')
  }

  return term
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
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
}) => ({
  intent,
  entityId,
  dataType,
  data,
  metadata,
})

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

  return createContextResult({
    intent,
    dataType: 'MEDICINE_AVAILABILITY',
    data: availabilityResults,
    metadata: {
      searchTerm,
      medicineMatches: medicines.length,
      medicinesChecked: availabilityResults.length,
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