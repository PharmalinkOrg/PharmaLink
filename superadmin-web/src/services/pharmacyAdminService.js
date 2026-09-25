import { getAccessToken } from './authService'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

function getAuthHeaders() {
  const token = getAccessToken()

  if (!token) {
    throw new Error(
      'You are not authenticated. Please sign in again.'
    )
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/* ============================================================
   GET PHARMACY ADMINS

   The existing backend endpoint:
   GET /api/users/superadmin

   returns PHARMACY_ADMIN and CUSTOMER users.

   For this page, we only keep PHARMACY_ADMIN records.
============================================================ */

export async function getPharmacyAdmins() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/superadmin`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          'Failed to fetch pharmacy admins'
      )
    }

    const users = result.data || []

    return users.filter(
      (user) => user.role === 'PHARMACY_ADMIN'
    )
  } catch (error) {
    console.error(
      'getPharmacyAdmins error:',
      error
    )

    throw error
  }
}

/* ============================================================
   CREATE PHARMACY ADMIN

   Existing backend:
   POST /api/users/pharmacy-admin
============================================================ */

export async function createPharmacyAdmin(payload) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/pharmacy-admin`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          'Failed to create pharmacy admin'
      )
    }

    return result.data
  } catch (error) {
    console.error(
      'createPharmacyAdmin error:',
      error
    )

    throw error
  }
}