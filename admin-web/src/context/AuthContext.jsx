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
      body: { email, password },
    })
    const accessToken = loginResponse.data.session.access_token
    const profileResponse = await apiRequest('/auth/me', { token: accessToken })
    const user = profileResponse.data

    if (user.role !== 'PHARMACY_ADMIN' || !user.pharmacy_id) {
      throw new Error('This account is not a pharmacy administrator account')
    }

    const nextSession = { accessToken, user }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
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
