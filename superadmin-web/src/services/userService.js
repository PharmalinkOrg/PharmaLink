import { getAccessToken } from './authService'

const API_URL = 'http://localhost:5000/api'

export const getSuperAdminUsers = async () => {
  const token = getAccessToken()

  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.')
  }

  const response = await fetch(`${API_URL}/users/superadmin`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to fetch users')
  }

  return result.data || []
}