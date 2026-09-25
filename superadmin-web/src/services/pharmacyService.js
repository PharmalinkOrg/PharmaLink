// File: superadmin-web/src/services/pharmacyService.js

import { getAccessToken } from './authService'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'

/* ============================================================
   AUTH HEADERS
============================================================ */

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
   RESPONSE HANDLER
============================================================ */

async function parseResponse(response) {
  let result

  try {
    result = await response.json()
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status})`
    )
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        `Request failed with status ${response.status}`
    )
  }

  return result
}

/* ============================================================
   GET ALL PHARMACIES
============================================================ */

/**
 * Fetch all pharmacies available to the Super Admin.
 *
 * This uses the existing Super Admin endpoint so the
 * Pharmacies page can continue using the same backend flow.
 */
export async function getPharmacies() {
  const response = await fetch(
    `${API_BASE_URL}/superadmin/pharmacies`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const result = await parseResponse(response)

  return result.data || []
}

/* ============================================================
   GET PHARMACY BY ID
============================================================ */

/**
 * Fetch one pharmacy.
 */
export async function getPharmacyById(pharmacyId) {
  if (!pharmacyId) {
    throw new Error('Pharmacy ID is required')
  }

  const response = await fetch(
    `${API_BASE_URL}/pharmacies/${pharmacyId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const result = await parseResponse(response)

  return result.data
}

/* ============================================================
   CREATE PARTNER PHARMACY
============================================================ */

/**
 * Create a pharmacy registered by the Super Admin.
 *
 * Expected payload:
 *
 * {
 *   name,
 *   address,
 *   contact_number,
 *   email,
 *   latitude,
 *   longitude
 * }
 */
export async function createPharmacy(payload) {
  if (!payload) {
    throw new Error(
      'Pharmacy information is required'
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/pharmacies`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  const result = await parseResponse(response)

  return result.data
}

/* ============================================================
   UPDATE PARTNER PHARMACY
============================================================ */

/**
 * Update pharmacy information.
 *
 * This can also be used later when the Super Admin
 * moves or corrects a pharmacy map location.
 *
 * Example:
 *
 * updatePharmacy(20, {
 *   latitude: 10.33149,
 *   longitude: 123.90785
 * })
 */
export async function updatePharmacy(
  pharmacyId,
  payload
) {
  if (!pharmacyId) {
    throw new Error('Pharmacy ID is required')
  }

  if (!payload) {
    throw new Error(
      'Pharmacy update information is required'
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/pharmacies/${pharmacyId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  const result = await parseResponse(response)

  return result.data
}

/* ============================================================
   CREATE PHARMACY ADMIN
============================================================ */

/**
 * Create the administrator account associated with
 * a partner pharmacy.
 *
 * Expected payload:
 *
 * {
 *   pharmacy_id,
 *   first_name,
 *   last_name,
 *   email,
 *   phone,
 *   password
 * }
 */
export async function createPharmacyAdmin(payload) {
  if (!payload) {
    throw new Error(
      'Pharmacy administrator information is required'
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/users/pharmacy-admin`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  const result = await parseResponse(response)

  return result.data
}