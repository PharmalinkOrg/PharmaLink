import { createContext, useCallback, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

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
    const data = await api.signIn(email.trim().toLowerCase(), password)
    if (!data.session) {
      throw new Error('Login succeeded but no authentication session was returned.')
    }
    const nextSession = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return nextSession
  }, [])

  const register = useCallback(async (form) => {
    const data = await api.register({ ...form, email: form.email.trim().toLowerCase() })
    if (data.session) {
      const nextSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: data.user,
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
    }
    return data
  }, [])

  const resetPassword = useCallback(async (email) => {
    return await api.resetPassword(email.trim().toLowerCase())
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Unable to sign out of Supabase:', error)
    } finally {
      localStorage.removeItem(SESSION_KEY)
      setSession(null)
    }
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
      resetPassword,
      signOut,
    }),
    [session, signIn, register, resetPassword, signOut],
  )

  // The JSX below must be in a .jsx file, NOT useAuth.js!
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}