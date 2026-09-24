/*
 * PharmaLink AI Frontend Navigation Allowlist
 *
 * This file is the frontend security boundary for navigation
 * actions returned by the AI Assistant API.
 *
 * IMPORTANT:
 * - The backend returns symbolic targets such as MY_RESERVATIONS.
 * - The frontend decides which React Router path is allowed.
 * - Never navigate directly to a URL supplied by an AI provider.
 * - Unknown or unsupported targets must be rejected.
 */

export const AI_NAVIGATION_ROUTES = Object.freeze({
  HOME: '/',

  MEDICINE_SEARCH: '/search',

  UPLOAD_PRESCRIPTION: '/upload-prescription',

  MY_RESERVATIONS: '/my-reservations',

  MEDICINE_REQUEST: '/request-medicine',

  PROFILE: '/profile',
})

/*
 * Returns true only when the action has the expected structure
 * and its target exists in PharmaLink's frontend allowlist.
 */
export function isValidAINavigationAction(action) {
  if (!action || typeof action !== 'object') {
    return false
  }

  if (action.type !== 'NAVIGATE') {
    return false
  }

  if (
    typeof action.target !== 'string' ||
    !action.target
  ) {
    return false
  }

  if (
    typeof action.label !== 'string' ||
    !action.label.trim()
  ) {
    return false
  }

  return Object.prototype.hasOwnProperty.call(
    AI_NAVIGATION_ROUTES,
    action.target
  )
}

/*
 * Resolves a validated symbolic target into a local React route.
 *
 * Returns null for anything not explicitly allowed.
 */
export function getAINavigationRoute(action) {
  if (!isValidAINavigationAction(action)) {
    return null
  }

  return AI_NAVIGATION_ROUTES[action.target]
}