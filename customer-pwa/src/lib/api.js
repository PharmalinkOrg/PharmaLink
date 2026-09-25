import { supabase } from './supabaseClient'

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '')

const SESSION_KEY = 'pharmalink-customer-session'

export async function apiRequest(
  path,
  {
    token,
    method = 'GET',
    body,
  } = {},
) {
  let accessToken = token

  if (!accessToken) {
    try {
      const storedSession =
        localStorage.getItem(SESSION_KEY)

      if (storedSession) {
        const session =
          JSON.parse(storedSession)

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
            body: JSON.stringify(body),
          }
        : {}),
    },
  )

  const payload =
    await response
      .json()
      .catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        'The request could not be completed',
    )
  }

  return payload
}

export const api = {
  // Pharmacies

  getPharmacies: async () => {
    const response =
      await apiRequest(
        '/pharmacies',
      )

    return response?.data || []
  },

  // Medicines

  getAvailableMedicines:
    async () => {
      const response =
        await apiRequest(
          '/pharmacies/available-medicines',
        )

      return response?.data || []
    },

  getMedicineCategories:
    async () => {
      const response =
        await apiRequest(
          '/medicine-categories',
        )

      return response?.data || []
    },

  // Reservations

  createReservation:
    async (reservationData) => {
      return apiRequest(
        '/reservations',
        {
          method: 'POST',
          body: reservationData,
        },
      )
    },

  getMyReservations:
    async () => {
      const response =
        await apiRequest(
          '/reservations',
        )

      return response?.data || []
    },

  // Medicine Requests

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

  // Prescriptions

  createPrescription:
    async (prescriptionData) => {
      return apiRequest(
        '/prescriptions',
        {
          method: 'POST',
          body: prescriptionData,
        },
      )
    },

  // Customer Profile

  getMyProfile: async () => {
    const response =
      await apiRequest(
        '/users/me/profile',
      )

    return response?.data || null
  },

  updateMyProfile:
    async (profileData) => {
      const response =
        await apiRequest(
          '/users/me/profile',
          {
            method: 'PATCH',
            body: profileData,
          },
        )

      return response?.data || null
    },

  // Authentication

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
              window.location.origin,
          },
        )

    if (error) {
      throw error
    }

    return data
  },
}