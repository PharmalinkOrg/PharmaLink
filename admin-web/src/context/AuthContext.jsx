import { useMemo, useState } from 'react'
import { apiRequest } from '../lib/api'
import { AuthContext } from './authContext'

const SESSION_KEY = 'pharmalink-admin-session'

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession)

const signIn = async (email, password) => {
  const loginResponse = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
      login_scope: 'PHARMACY_ADMIN',
    },
  })

  // Backend returns: { success, message, data: { user, pharmaUser, session } }
  const { session, pharmaUser } = loginResponse.data
  const accessToken = session.access_token

  // The backend already validates role and pharmacy_id, 
  // but we double-check here for safety
  if (
    pharmaUser.role !== 'PHARMACY_ADMIN' &&
    pharmaUser.role !== 'PHARMACY_STAFF'
  ) {
    throw new Error(
      'This account is not authorized to access Pharmacy Admin'
    )
  }

  if (!pharmaUser.pharmacy_id) {
    throw new Error(
      'This pharmacy account is not assigned to a pharmacy'
    )
  }

  const nextSession = {
    accessToken,
    user: pharmaUser,
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(nextSession)
  )

  setSession(nextSession)
}

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  const value = useMemo(() => ({
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null,
    signIn,
    signOut,
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
