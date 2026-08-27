const API_URL = 'http://localhost:5000/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Get reservations for the authenticated pharmacy
export const getPharmacyReservations = async () => {
  const response = await fetch(
    `${API_URL}/reservations/pharmacy`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to load reservations'
    )
  }

  return data
}

// Update reservation status
export const updateReservationStatus = async (
  reservationId,
  status
) => {
  const response = await fetch(
    `${API_URL}/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to update reservation status'
    )
  }

  return data
}