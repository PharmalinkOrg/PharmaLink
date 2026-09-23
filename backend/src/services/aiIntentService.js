/* ============================================================
   PHARMALINK AI INTENT SERVICE

   Determines which controlled data source, if any, may be
   relevant to the customer's message.

   This service does NOT query the database.
============================================================ */

const AI_INTENTS = Object.freeze({
  GENERAL: 'GENERAL',

  MEDICINE_SEARCH: 'MEDICINE_SEARCH',
  MEDICINE_AVAILABILITY: 'MEDICINE_AVAILABILITY',

  RESERVATION_LIST: 'RESERVATION_LIST',
  RESERVATION_STATUS: 'RESERVATION_STATUS',

  PRESCRIPTION_LIST: 'PRESCRIPTION_LIST',
  PRESCRIPTION_STATUS: 'PRESCRIPTION_STATUS',

  MEDICINE_REQUEST_LIST: 'MEDICINE_REQUEST_LIST',
  MEDICINE_REQUEST_STATUS: 'MEDICINE_REQUEST_STATUS',
})

/* ============================================================
   HELPERS
============================================================ */

const normalizeMessage = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const containsAny = (message, phrases) => {
  return phrases.some((phrase) => message.includes(phrase))
}

/**
 * Extract a positive integer associated with an ID/reference.
 *
 * Examples:
 *   "reservation 12"
 *   "reservation #12"
 *   "reservation id 12"
 *   "prescription #5"
 *   "request id 8"
 */
const extractEntityId = (message, entityWords = []) => {
  if (!message) {
    return null
  }

  for (const entityWord of entityWords) {
    const escapedWord = entityWord.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    const patterns = [
      new RegExp(
        `${escapedWord}\\s*(?:id\\s*)?#?\\s*(\\d+)`,
        'i'
      ),
      new RegExp(
        `${escapedWord}\\s*(?:number|no\\.?|#)\\s*(\\d+)`,
        'i'
      ),
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)

      if (!match) {
        continue
      }

      const id = Number(match[1])

      if (Number.isInteger(id) && id > 0) {
        return id
      }
    }
  }

  return null
}

/* ============================================================
   INTENT DETECTION
============================================================ */

const detectCustomerIntent = (rawMessage) => {
  const message = normalizeMessage(rawMessage)

  if (!message) {
    return {
      intent: AI_INTENTS.GENERAL,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     RESERVATIONS
  ---------------------------------------------------------- */

  const mentionsReservation = containsAny(message, [
    'reservation',
    'reservations',
    'reserved',
    'pickup reservation',
  ])

  if (mentionsReservation) {
    const entityId = extractEntityId(message, [
      'reservation',
    ])

    const asksForStatus = containsAny(message, [
      'status',
      'what happened',
      'ready',
      'confirmed',
      'pending',
      'completed',
      'cancelled',
      'expired',
      'pickup',
    ])

    if (entityId || asksForStatus) {
      return {
        intent: AI_INTENTS.RESERVATION_STATUS,
        entityId,
      }
    }

    return {
      intent: AI_INTENTS.RESERVATION_LIST,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     PRESCRIPTIONS
  ---------------------------------------------------------- */

  const mentionsPrescription = containsAny(message, [
    'prescription',
    'prescriptions',
  ])

  if (mentionsPrescription) {
    const entityId = extractEntityId(message, [
      'prescription',
    ])

    const asksForStatus = containsAny(message, [
      'status',
      'verified',
      'verification',
      'pending',
      'under review',
      'reviewed',
      'rejected',
      'expired',
      'cancelled',
    ])

    if (entityId || asksForStatus) {
      return {
        intent: AI_INTENTS.PRESCRIPTION_STATUS,
        entityId,
      }
    }

    return {
      intent: AI_INTENTS.PRESCRIPTION_LIST,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     MEDICINE REQUESTS
  ---------------------------------------------------------- */

  const mentionsMedicineRequest = containsAny(message, [
    'medicine request',
    'medicine requests',
    'my request',
    'my requests',
    'requested medicine',
  ])

  if (mentionsMedicineRequest) {
    const entityId = extractEntityId(message, [
      'medicine request',
      'request',
    ])

    const asksForStatus = containsAny(message, [
      'status',
      'available',
      'partially available',
      'unavailable',
      'pending',
      'under review',
      'fulfilled',
      'cancelled',
      'reviewed',
    ])

    if (entityId || asksForStatus) {
      return {
        intent: AI_INTENTS.MEDICINE_REQUEST_STATUS,
        entityId,
      }
    }

    return {
      intent: AI_INTENTS.MEDICINE_REQUEST_LIST,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     MEDICINE AVAILABILITY
  ---------------------------------------------------------- */

  const asksAvailability = containsAny(message, [
    'do you have',
    'does any pharmacy have',
    'which pharmacy has',
    'what pharmacy has',

    'check if',
    'check whether',

    'available',
    'availability',
    'in stock',
    'stock',

    'have this medicine',
    'have the medicine',

    'which pharmacy',
    'what pharmacy',

    'where can i find',
    'where can i get',

    'price',
    'how much',
    'cost',
  ])

  if (asksAvailability) {
    return {
      intent: AI_INTENTS.MEDICINE_AVAILABILITY,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     MEDICINE SEARCH / INFORMATION
  ---------------------------------------------------------- */

  const asksMedicineSearch = containsAny(message, [
    'medicine',
    'medication',
    'drug',
    'generic name',
    'brand name',

    // Search-style phrases
    'help me find',
    'find me',
    'search for',
    'search medicine',
    'search medication',
    'look for',
  ])

  if (asksMedicineSearch) {
    return {
      intent: AI_INTENTS.MEDICINE_SEARCH,
      entityId: null,
    }
  }

  /* ----------------------------------------------------------
     GENERAL
  ---------------------------------------------------------- */

  return {
    intent: AI_INTENTS.GENERAL,
    entityId: null,
  }
}

module.exports = {
  AI_INTENTS,
  detectCustomerIntent,
}