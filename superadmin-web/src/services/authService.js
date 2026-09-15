const API_URL = 'http://localhost:5000/api'

export const loginSuperAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      login_scope: 'SUPER_ADMIN',
    }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Login failed')
  }

  const session = result.data?.session

  if (!session?.access_token) {
    throw new Error('Login succeeded but no access token was returned')
  }

  sessionStorage.setItem(
    'pharmalink_access_token',
    session.access_token
  )

  return result.data
}

export const getAccessToken = () => {
  return sessionStorage.getItem('pharmalink_access_token')
}

export const logoutSuperAdmin = () => {
  sessionStorage.removeItem('pharmalink_access_token')
}