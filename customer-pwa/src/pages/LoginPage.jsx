import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/useAuth'

// Password requirements validation
const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

function LoginPage() {
  const navigate = useNavigate()
  const { signIn, register, resetPassword } = useAuth() // Added resetPassword hook

  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))

    setError('')
    setSuccessMessage('')
  }

  const handleForgotEmailChange = (event) => {
    setForgotEmail(event.target.value)
    setError('')
    setSuccessMessage('')
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      // Ensure you have a resetPassword method in your useAuth hook
      await resetPassword(forgotEmail)
      setSuccessMessage('Password reset link sent to your email.')
      setIsForgotPassword(false) // Optional: return to login after success
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    // Validate password during registration
    if (isRegistering) {
      const passwordError = validatePassword(form.password)
      if (passwordError) {
        setError(passwordError)
        setIsSubmitting(false)
        return
      }
    }

    try {
      if (isRegistering) {
        const response = await register(form)

        if (!response?.session) {
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
    setIsForgotPassword(false)
    setShowPassword(false)
    setError('')
    setSuccessMessage('')

    setForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
    })
  }

  const goToForgotPassword = () => {
    setIsForgotPassword(true)
    setError('')
    setSuccessMessage('')
    setForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
    })
  }

  // RENDER FORGOT PASSWORD VIEW
  if (isForgotPassword) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <p className="eyebrow">PharmaLink</p>
          <h1>Reset password</h1>
          <p className="page-copy">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form className="auth-form" onSubmit={handleForgotPassword}>
            <label className="profile-field">
              <span>Email address</span>
              <input
                name="email"
                type="email"
                value={forgotEmail}
                onChange={handleForgotEmailChange}
                autoComplete="email"
                required
              />
            </label>

            <button
              className="profile-save-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          {successMessage && (
            <p className="profile-status success" role="status">
              {successMessage}
            </p>
          )}
          
          {error && (
            <p className="profile-status error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-switch"
            type="button"
            onClick={() => setIsForgotPassword(false)}
          >
            Back to sign in
          </button>
        </div>
      </main>
    )
  }

  // RENDER LOGIN / REGISTER VIEW
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
            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                minLength="8"
                value={form.password}
                onChange={handleChange}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  opacity: '0.7'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {isRegistering && (
              <span className="password-hint">
                * Min 8 characters, 1 Uppercase, 1 Number, 1 Special character
              </span>
            )}
          </label>

          {!isRegistering && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '-16px',
              marginBottom: '-4px',
              fontSize: '0.88rem'
            }}>
              <label style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                flexDirection: 'row',
                flexWrap: 'nowrap'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ 
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    margin: '0',
                    flexShrink: '0',
                    outline: 'none'
                  }}
                />
                <span style={{ 
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}>Remember me</span>
              </label>
              
              <button
                type="button"
                onClick={goToForgotPassword}
                style={{ 
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  padding: '0',
                  textDecoration: 'none'
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

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

        {successMessage && (
          <p className="profile-status success" role="status">
            {successMessage}
          </p>
        )}

        <button
          className="auth-switch"
          type="button"
          onClick={toggleMode}
          style={{ textAlign: 'center', display: 'block', width: '100%' }}
        >
          {isRegistering
            ? 'Already have an account? Sign in'
            : <>Don't have an account? <strong>Sign up</strong></>}
        </button>
      </div>
    </main>
  )
}

export default LoginPage