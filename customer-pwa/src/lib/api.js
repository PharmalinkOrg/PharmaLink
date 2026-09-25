import { supabase } from './supabaseClient'

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '')

const SESSION_KEY =
  'pharmalink-customer-session'

// ============================================================
// SHARED BACKEND API REQUEST HELPER
// ============================================================

export async function apiRequest(
  path,
  {
    token,
    method = 'GET',
    body,
  } = {},
) {
  let accessToken = token

  // ----------------------------------------------------------
  // Read stored customer access token when one was not
  // explicitly supplied.
  // ----------------------------------------------------------

  if (!accessToken) {
    try {
      const storedSession =
        localStorage.getItem(
          SESSION_KEY,
        )

      if (storedSession) {
        const session =
          JSON.parse(
            storedSession,
          )

        accessToken =
          session?.accessToken
      }
    } catch (error) {
      console.error(
        'Unable to read customer session:',
        error,
      )
    }
  }

  // ----------------------------------------------------------
  // Send request
  // ----------------------------------------------------------

  const response = await fetch(
    `${API_URL}${path}`,
    {
      method,

      headers: {
        ...(body
          ? {
              'Content-Type':
                'application/json',
            }
          : {}),

        ...(accessToken
          ? {
              Authorization:
                `Bearer ${accessToken}`,
            }
          : {}),
      },

      ...(body
        ? {
            body:
              JSON.stringify(body),
          }
        : {}),
    },
  )

  // ----------------------------------------------------------
  // Parse backend JSON
  // ----------------------------------------------------------

  const payload =
    await response
      .json()
      .catch(() => ({}))

  // ----------------------------------------------------------
  // Throw backend message for failed requests
  // ----------------------------------------------------------

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        'The request could not be completed',
    )
  }

  /*
   * IMPORTANT:
   *
   * Return the complete backend payload here.
   *
   * Individual API methods can decide whether they need:
   *
   * response
   *
   * or:
   *
   * response.data
   */
  return payload
}

// ============================================================
// API METHODS
// ============================================================

export const api = {
  // ==========================================================
  // PHARMACIES
  // ==========================================================

  getPharmacies: async () => {
    const response =
      await apiRequest(
        '/pharmacies',
      )

    return response?.data || []
  },

  // ==========================================================
  // MEDICINES
  // ==========================================================

  /*
   * Uses the same customer-facing availability endpoint
   * used by PharmaLink medicine search.
   */

  getAvailableMedicines:
    async () => {
      const response =
        await apiRequest(
          '/pharmacies/available-medicines',
        )

      return response?.data || []
    },

  // ==========================================================
  // MEDICINE REQUESTS
  // ==========================================================

  createMedicineRequest:
    async (requestData) => {
      const response =
        await apiRequest(
          '/medicine-requests',
          {
            method: 'POST',
            body: requestData,
          },
        )

      return response?.data || null
    },

  getMyMedicineRequests:
    async () => {
      const response =
        await apiRequest(
          '/medicine-requests',
        )

      return response?.data || []
    },

  getMedicineRequestById:
    async (requestId) => {
      const response =
        await apiRequest(
          `/medicine-requests/${requestId}`,
        )

      return response?.data || null
    },

  cancelMedicineRequest:
    async (requestId) => {
      const response =
        await apiRequest(
          `/medicine-requests/${requestId}/cancel`,
          {
            method: 'PATCH',
          },
        )

      return response?.data || null
    },

  // ==========================================================
  // PRESCRIPTIONS
  // ==========================================================

  createPrescription:
    async (prescriptionData) => {
      const response =
        await apiRequest(
          '/prescriptions',
          {
            method: 'POST',
            body:
              prescriptionData,
          },
        )

      /*
       * IMPORTANT:
       *
       * Unlike methods above, return the COMPLETE response.
       *
       * UploadPrescriptionPage needs:
       *
       * response.success
       * response.message
       * response.data
       *
       * Example:
       *
       * {
       *   success: true,
       *   message:
       *     'Prescription uploaded successfully',
       *   data: {...}
       * }
       */
      return response
    },

  // ==========================================================
  // AUTH
  // ==========================================================

  signIn: async (
    email,
    password,
  ) => {
    const {
      data,
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        })

    if (error) {
      throw error
    }

    return data
  },

  register: async (form) => {
    const response =
      await apiRequest(
        '/auth/register',
        {
          method: 'POST',

          body: {
            first_name:
              form.first_name,

            last_name:
              form.last_name,

            phone:
              form.phone,

            email:
              form.email,

            password:
              form.password,
          },
        },
      )

    return response?.data
  },

  resetPassword: async (
    email,
  ) => {
    const {
      data,
      error,
    } =
      await supabase.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location
                .origin,
          },
        )

    if (error) {
      throw error
    }

    return data
  },
}