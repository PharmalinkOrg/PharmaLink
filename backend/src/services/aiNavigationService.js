/*
 * PharmaLink AI Navigation Service
 *
 * Resolves customer messages into SAFE symbolic navigation
 * targets.
 *
 * Important:
 * - This service does not perform navigation.
 * - It does not accept arbitrary URLs from the AI provider.
 * - Only targets defined in NAVIGATION_ACTIONS can be returned.
 */

const NAVIGATION_ACTIONS = Object.freeze({
  HOME: {
    type: 'NAVIGATE',
    target: 'HOME',
    label: 'Go to Home',
  },

  MEDICINE_SEARCH: {
    type: 'NAVIGATE',
    target: 'MEDICINE_SEARCH',
    label: 'Search Medicines',
  },

  UPLOAD_PRESCRIPTION: {
    type: 'NAVIGATE',
    target: 'UPLOAD_PRESCRIPTION',
    label: 'Upload Prescription',
  },

  MY_RESERVATIONS: {
    type: 'NAVIGATE',
    target: 'MY_RESERVATIONS',
    label: 'View Reservations',
  },

  MEDICINE_REQUEST: {
    type: 'NAVIGATE',
    target: 'MEDICINE_REQUEST',
    label: 'Request Medicine',
  },

  PROFILE: {
    type: 'NAVIGATE',
    target: 'PROFILE',
    label: 'View Profile',
  },
})

const normalizeMessage = (message) => {
  if (typeof message !== 'string') {
    return ''
  }

  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/*
 * Return a fresh copy so callers cannot accidentally modify
 * the allowlist object.
 */
const createNavigationAction = (target) => {
  const action = NAVIGATION_ACTIONS[target]

  if (!action) {
    return null
  }

  return {
    type: action.type,
    target: action.target,
    label: action.label,
  }
}

const resolveNavigationAction = (message) => {
  const normalized = normalizeMessage(message)

  if (!normalized) {
    return null
  }

  if (
    normalized.includes('upload prescription') ||
    normalized.includes('upload my prescription') ||
    normalized.includes('submit prescription') ||
    normalized.includes('submit my prescription') ||
    normalized.includes('send prescription') ||
    normalized.includes('add prescription')
  ) {
    return createNavigationAction(
      'UPLOAD_PRESCRIPTION'
    )
  }

  /*
   * Reservation history/status.
   */
  if (
    normalized.includes('my reservations') ||
    normalized.includes('view reservations') ||
    normalized.includes('reservation history') ||
    normalized.includes('see reservations')
  ) {
    return createNavigationAction(
      'MY_RESERVATIONS'
    )
  }

  /*
   * Create/request an unavailable medicine.
   */
  if (
    normalized.includes('request medicine') ||
    normalized.includes('request a medicine') ||
    normalized.includes('request medication') ||
    normalized.includes('submit medicine request') ||
    normalized.includes('make medicine request')
  ) {
    return createNavigationAction(
      'MEDICINE_REQUEST'
    )
  }

  /*
   * Medicine search.
   */
  if (
    normalized.includes('search medicines') ||
    normalized.includes('search medicine') ||
    normalized.includes('find medicine') ||
    normalized.includes('find a medicine') ||
    normalized.includes('look for medicine')
  ) {
    return createNavigationAction(
      'MEDICINE_SEARCH'
    )
  }

  /*
   * Customer profile.
   */
  if (
    normalized.includes('my profile') ||
    normalized.includes('view profile') ||
    normalized.includes('edit profile') ||
    normalized.includes('profile settings')
  ) {
    return createNavigationAction('PROFILE')
  }

  /*
   * Home is intentionally narrow so normal conversational
   * uses of the word "home" do not unnecessarily create
   * navigation buttons.
   */
  if (
    normalized === 'home' ||
    normalized.includes('go to home') ||
    normalized.includes('back to home') ||
    normalized.includes('home page')
  ) {
    return createNavigationAction('HOME')
  }

  return null
}

module.exports = {
  NAVIGATION_ACTIONS,
  createNavigationAction,
  resolveNavigationAction,
}