// File: superadmin-web/src/services/userService.js

import { getAccessToken } from './authService'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Fetches Super Admin users.
 *
 * Called with no arguments it behaves exactly as before.
 * UsersPage passes { page, limit } so it can load every user in
 * batches; the backend can use or ignore these parameters.
 *
 * Always returns an array of users.
 */
export const getSuperAdminUsers = async ({ page, limit, role } = {}) => {
  const token = getAccessToken()

  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.')
  }

  const params = new URLSearchParams()

  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  if (role) params.set('role', role)

  const query = params.toString()

  const response = await fetch(
    `${API_URL}/users/superadmin${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  // A crashed server or proxy can return HTML instead of JSON.
  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        (response.status === 401 || response.status === 403
          ? 'Your session has expired. Please sign in again.'
          : `Failed to fetch users (HTTP ${response.status}).`)
    )
  }

  return Array.isArray(result.data) ? result.data : []
}

/**
 * Activate or deactivate a customer or pharmacy admin account.
 * The reason is stored in the audit log on the server.
 *
 * PATCH /api/superadmin/users/:id/status
 * body: { status: 'ACTIVE' | 'INACTIVE', reason }
 */
export const updateUserStatus = async (userId, status, reason = null) => {
  const token = getAccessToken()

  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.')
  }

  const response = await fetch(`${API_URL}/superadmin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, reason }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        (response.status === 404
          ? 'Account status changes are not available on the server yet.'
          : `Failed to update the account (HTTP ${response.status}).`)
    )
  }

  return result.data
}

/* ============================================================
   LOAD EVERY USER

   Requests users in batches until the server runs out. If the
   backend ignores page/limit and returns everyone at once, this
   stops after the first call.
============================================================ */

const FETCH_BATCH_SIZE = 100
const MAX_FETCH_BATCHES = 50

export const getAllSuperAdminUsers = async ({ role } = {}) => {
  const allUsers = []
  const seenIds = new Set()

  for (let page = 1; page <= MAX_FETCH_BATCHES; page += 1) {
    const rows = await getSuperAdminUsers({ page, limit: FETCH_BATCH_SIZE, role })
    let added = 0

    rows.forEach((user) => {
      const id = user?.user_id ?? user?.id ?? user?.email

      if (seenIds.has(id)) {
        return
      }

      seenIds.add(id)
      allUsers.push(user)
      added += 1
    })

    if (added === 0 || rows.length < FETCH_BATCH_SIZE) {
      break
    }
  }

  return allUsers
}
