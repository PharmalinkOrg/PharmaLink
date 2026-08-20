import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const SESSION_KEY = 'pharmalink-customer-session'

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [status, setStatus] = useState(() => (
    getStoredSession()?.accessToken
      ? { type: '', message: '' }
      : { type: 'error', message: 'Sign in to view and edit your profile.' }
  ))
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredSession()?.accessToken))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const session = getStoredSession()

    if (!session?.accessToken) {
      return
    }

    apiRequest('/users/me/profile', { token: session.accessToken })
      .then((response) => {
        const nextProfile = response.data
        setProfile(nextProfile)
        setForm({
          first_name: nextProfile.first_name || '',
          last_name: nextProfile.last_name || '',
          phone: nextProfile.phone || '',
        })
      })
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setIsLoading(false))
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setStatus({ type: '', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const session = getStoredSession()
    setIsSaving(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await apiRequest('/users/me/profile', {
        token: session?.accessToken,
        method: 'PATCH',
        body: form,
      })
      setProfile(response.data)
      setForm({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone: response.data.phone || '',
      })
      setStatus({ type: 'success', message: 'Your profile has been saved.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-heading">
        <p className="eyebrow">Account</p>
        <h2 id="profile-title" className="page-title">My profile</h2>
        <p className="page-copy">
          Your details stay private and are only used to manage your PharmaLink account.
        </p>
      </div>

      <div className="profile-panel">
        <div className="profile-panel-heading">
          <div>
            <h3>Personal details</h3>
            <p>Only your name and phone number can be changed.</p>
          </div>
          <span className="privacy-badge">Private</span>
        </div>

        {isLoading && <p className="profile-state">Loading your profile...</p>}
        {!isLoading && profile && <form className="profile-fields" onSubmit={handleSubmit}>
          <label className="profile-field">
            <span>First name</span>
            <input name="first_name" type="text" value={form.first_name} onChange={handleChange} required />
          </label>
          <label className="profile-field">
            <span>Last name</span>
            <input name="last_name" type="text" value={form.last_name} onChange={handleChange} required />
          </label>
          <label className="profile-field">
            <span>Phone number</span>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
          </label>
          <label className="profile-field profile-field-wide">
            <span>Email address</span>
            <input type="email" value={profile.email || ''} readOnly />
            <small>This is your account login and cannot be changed here.</small>
          </label>
          <button className="profile-save-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </form>}
        {status.message && (
          <p className={`profile-status ${status.type}`} role="status">{status.message}</p>
        )}
        {!isLoading && !profile && (
          <Link className="profile-login-link" to="/login">Sign in or create an account</Link>
        )}
      </div>

      <p className="profile-security-note">
        We do not share your personal details with pharmacies unless needed to fulfill a reservation.
      </p>
    </section>
  )
}

export default ProfilePage