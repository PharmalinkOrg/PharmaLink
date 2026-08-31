import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/useAuth'

function LoginPage() {
  const navigate = useNavigate()
  const { signIn, register } = useAuth()

  const [isRegistering, setIsRegistering] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))

    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (isRegistering) {
  const response = await register(form)

  if (!response.data.session) {
    setError('Account created. Please sign in.')
    setIsRegistering(false)
    return
  }

  navigate('/')
  return
}

await signIn(form.email, form.password)
navigate('/')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering((current) => !current)
    setError('')

    setForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
    })
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">PharmaLink</p>

        <h1>
          {isRegistering ? 'Create your account' : 'Welcome back'}
        </h1>

        <p className="page-copy">
          {isRegistering
            ? 'Create your PharmaLink account and start finding medicines near you.'
            : 'Sign in to continue using PharmaLink.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="auth-name-fields">
              <label className="profile-field">
                <span>First name</span>
                <input
                  name="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />
              </label>

              <label className="profile-field">
                <span>Last name</span>
                <input
                  name="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>
          )}

          {isRegistering && (
            <label className="profile-field">
              <span>Phone number</span>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </label>
          )}

          <label className="profile-field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label className="profile-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              minLength="8"
              value={form.password}
              onChange={handleChange}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
            />
          </label>

          <button
            className="profile-save-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Please wait...'
              : isRegistering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        {error && (
          <p className="profile-status error" role="alert">
            {error}
          </p>
        )}

        <button
          className="auth-switch"
          type="button"
          onClick={toggleMode}
        >
          {isRegistering
            ? 'Already have an account? Sign in'
            : 'New to PharmaLink? Create an account'}
        </button>
      </div>
    </main>
  )
}

export default LoginPage