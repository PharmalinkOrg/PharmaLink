import { apiRequest } from '../lib/api'

/**
 * Get reservations for the authenticated pharmacy
 * GET /api/reservations/pharmacy
 */
export const getPharmacyReservations = async () => {
  const token = localStorage.getItem('access_token')

  if (!token) {
    throw new Error('Authentication token not found')
  }

  return apiRequest('/reservations/pharmacy', {
    method: 'GET',
    token,
  })
}

/**
 * Update reservation status
 * PATCH /api/reservations/:reservationId/status
 */
export const updateReservationStatus = async (
  reservationId,
  status
) => {
  const token = localStorage.getItem('access_token')

  if (!token) {
    throw new Error('Authentication token not found')
  }

  if (!reservationId) {
    throw new Error('Reservation ID is required')
  }

  if (!status) {
    throw new Error('Reservation status is required')
  }

  return apiRequest(
    `/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      token,
      body: {
        status,
      },
    }
  )
}