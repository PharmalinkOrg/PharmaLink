import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const SESSION_KEY = 'pharmalink-customer-session'

function LoginPage() {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await apiRequest(isRegistering ? '/auth/register' : '/auth/customer-login', {
        method: 'POST',
        body: isRegistering
          ? { ...form, email: form.email.trim().toLowerCase() }
          : { email: form.email.trim().toLowerCase(), password: form.password },
      })

      if (!response.data.session) {
        setError('Account created. Please sign in.')
        return
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        accessToken: response.data.session.access_token,
        user: response.data.user,
      }))
      navigate('/profile')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">PharmaLink</p>
        <h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="page-copy">
          {isRegistering ? 'Create an account to manage your profile.' : 'Sign in to manage your profile.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="auth-name-fields">
              <label className="profile-field">
                <span>First name</span>
                <input name="first_name" value={form.first_name} onChange={handleChange} required />
              </label>
              <label className="profile-field">
                <span>Last name</span>
                <input name="last_name" value={form.last_name} onChange={handleChange} required />
              </label>
            </div>
          )}
          {isRegistering && <label className="profile-field"><span>Phone number</span><input name="phone" type="tel" value={form.phone} onChange={handleChange} /></label>}
          <label className="profile-field"><span>Email address</span><input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
          <label className="profile-field"><span>Password</span><input name="password" type="password" minLength="8" value={form.password} onChange={handleChange} required /></label>
          <button className="profile-save-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {error && <p className="profile-status error" role="alert">{error}</p>}
        <button className="auth-switch" type="button" onClick={() => { setIsRegistering((current) => !current); setError('') }}>
          {isRegistering ? 'Already have an account? Sign in' : 'New to PharmaLink? Create an account'}
        </button>
      </div>
    </main>
  )
}

export default LoginPage