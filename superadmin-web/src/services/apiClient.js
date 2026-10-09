// File: superadmin-web/src/services/apiClient.js
//
// Shared fetch wrapper for the Super Admin API. Every backend
// response is expected to look like { success, message, data }.

import { getAccessToken } from './authService'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Error thrown for failed API calls. `status` lets callers react
 * to specific cases (404 = endpoint not built yet, 409 = conflict).
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new ApiError('You are not authenticated. Please sign in again.', 401)
  }

  const params = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const queryString = params.toString()

  const response = await fetch(
    `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  )

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    const fallback =
      response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : response.status === 403
          ? 'You do not have permission to do this.'
          : response.status === 404
            ? 'This feature is not available on the server yet.'
            : `Request failed (HTTP ${response.status}).`

    throw new ApiError(result?.message || fallback, response.status)
  }

  return result
}
