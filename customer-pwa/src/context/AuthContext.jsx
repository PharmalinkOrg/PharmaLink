import { createContext, useCallback, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api'

export const AuthContext = createContext(null)

const SESSION_KEY = 'pharmalink-customer-session'

const getStoredSession = () => {
  try {
    const storedSession = localStorage.getItem(SESSION_KEY)

    if (!storedSession) return null

    return JSON.parse(storedSession)
  } catch (error) {
    console.error('Unable to read customer session:', error)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession)

  const signIn = useCallback(async (email, password) => {
    const response = await apiRequest('/auth/customer-login', {
      method: 'POST',
      body: {
        email: email.trim().toLowerCase(),
        password,
      },
    })

    if (!response.data?.session) {
      throw new Error('Login succeeded but no authentication session was returned.')
    }

    const nextSession = {
      accessToken: response.data.session.access_token,
      refreshToken: response.data.session.refresh_token,
      user: response.data.user,
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)

    return nextSession
  }, [])

  const register = useCallback(async (form) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        ...form,
        email: form.email.trim().toLowerCase(),
      },
    })

    /*
     * If registration immediately returns a session,
     * authenticate the customer immediately.
     */
    if (response.data?.session) {
      const nextSession = {
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: response.data.user,
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
    }

    return response
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      signIn,
      register,
      signOut,
    }),
    [session, signIn, register, signOut],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}