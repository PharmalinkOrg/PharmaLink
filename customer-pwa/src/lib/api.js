// src/lib/api.js

import { supabase } from './supabaseClient'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '')

const SESSION_KEY = 'pharmalink-customer-session'

// --------------------------------------------------
// Shared backend API request helper
// --------------------------------------------------

export async function apiRequest(
  path,
  { token, method = 'GET', body } = {}
) {
  let accessToken = token

  if (!accessToken) {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY)

      if (storedSession) {
        const session = JSON.parse(storedSession)
        accessToken = session?.accessToken
      }
    } catch (error) {
      console.error('Unable to read customer session:', error)
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      payload.message || 'The request could not be completed'
    )
  }

  return payload
}

// --------------------------------------------------
// API methods
// --------------------------------------------------

export const api = {
  // --------------------------------------------------
  // PHARMACIES
  // Uses the PharmaLink backend
  // GET /api/pharmacies
  // --------------------------------------------------

  getPharmacies: async () => {
    const response = await apiRequest('/pharmacies')

    return response?.data || []
  },

  // --------------------------------------------------
  // PRESCRIPTIONS
  // Uses the PharmaLink backend
  // POST /api/prescriptions
  // --------------------------------------------------

  createPrescription: async (prescriptionData) => {
    const response = await apiRequest('/prescriptions', {
      method: 'POST',
      body: prescriptionData,
    })

    return response?.data || null
  },

  // --------------------------------------------------
  // --------------------------------------------------
  // AUTH
  // Login/reset use Supabase Auth directly.
  // Customer registration uses the PharmaLink backend.
  // --------------------------------------------------

  signIn: async (email, password) => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) throw error

    return data
  },

  register: async (form) => {
    const response = await apiRequest('/auth/register-customer', {
      method: 'POST',
      body: {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
        password: form.password,
      },
    })

    return response?.data
  },

  resetPassword: async (email) => {
    const { data, error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })

    if (error) throw error

    return data
  },
}