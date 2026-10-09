// File: superadmin-web/src/services/authService.js

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'pharmalink_access_token'
const USER_KEY = 'pharmalink_user'

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

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || 'Login failed')
  }

  const session = result.data?.session

  if (!session?.access_token) {
    throw new Error('Login succeeded but no access token was returned')
  }

  sessionStorage.setItem(TOKEN_KEY, session.access_token)

  // Remember who is signed in, so the UI can stop a Super Admin
  // from deactivating their own account.
  // data.pharmaUser is the PharmaLink profile (numeric user_id);
  // data.user is the Supabase Auth user.
  const user = result.data?.pharmaUser || null

  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  return result.data
}

export const getAccessToken = () => {
  return sessionStorage.getItem(TOKEN_KEY)
}

export const getCurrentUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const logoutSuperAdmin = () => {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}
