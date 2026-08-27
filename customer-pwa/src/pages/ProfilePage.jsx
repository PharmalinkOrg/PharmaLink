import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

const SESSION_KEY = 'pharmalink-customer-session'

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

const getInitials = (firstName, lastName) => {
  const first = firstName?.trim()?.[0] || ''
  const last = lastName?.trim()?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [status, setStatus] = useState(() => (
    getStoredSession()?.accessToken
      ? { type: '', message: '' }
      : { type: 'error', message: 'Sign in to view and edit your profile.' }
  ))
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredSession()?.accessToken))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

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

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const session = getStoredSession()
    if (!session?.accessToken || !session?.user?.id) {
      setStatus({ type: 'error', message: 'Sign in again to update your avatar.' })
      return
    }

    setIsUploadingAvatar(true)
    setStatus({ type: '', message: '' })

    try {
      // Attach this browser's Supabase client to the current session,
      // so Storage's RLS policies can resolve auth.uid() correctly.
      const { data: authSession, error: sessionError } =
  await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  })

if (sessionError) {
  throw new Error(`Supabase session error: ${sessionError.message}`)
}

if (!authSession?.session?.user) {
  throw new Error('Supabase authentication session could not be established.')
}

      const filePath = `${session.user.id}/avatar.png`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Persist the URL through the backend, same as any other profile field.
      const response = await apiRequest('/users/me/profile', {
        token: session.accessToken,
        method: 'PATCH',
        body: { ...form, avatar_url: publicUrlData.publicUrl },
      })

      setProfile(response.data)
      setStatus({ type: 'success', message: 'Your avatar has been updated.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to upload avatar.' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Even if server-side signout fails (e.g. token already expired),
      // still clear the local session so the user is logged out client-side.
    }
    localStorage.removeItem(SESSION_KEY)
    navigate('/login')
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="profile-title" className="page-title">My profile</h2>
          <p className="page-copy">
            Your details stay private and are only used to manage your PharmaLink account.
          </p>
        </div>
        {!isLoading && profile && (
          <button className="profile-logout-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        )}
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

        {!isLoading && profile && (
          <>
            <div className="profile-avatar-row">
              {profile.avatar_url ? (
                <img
                  className="profile-avatar-image"
                  src={profile.avatar_url}
                  alt="Your avatar"
                />
              ) : (
                <div className="profile-avatar-placeholder" aria-hidden="true">
                  {getInitials(profile.first_name, profile.last_name)}
                </div>
              )}
              <label className="profile-avatar-upload">
                {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  hidden
                />
              </label>
            </div>

            <form className="profile-fields" onSubmit={handleSubmit}>
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
            </form>
          </>
        )}

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