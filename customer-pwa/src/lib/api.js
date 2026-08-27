const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '')

const SESSION_KEY = 'pharmalink-customer-session'

export async function apiRequest(
  path,
  { token, method = 'GET', body } = {},
) {
  // Use the explicitly provided token first.
  // Otherwise, retrieve the customer's session token
  // from localStorage.
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
      payload.message || 'The request could not be completed',
    )
  }

  return payload
}
