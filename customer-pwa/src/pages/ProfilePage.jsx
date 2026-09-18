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
  const [isEditing, setIsEditing] = useState(false)

  // Mock state for toggles and settings
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  })
  const [appSettings, setAppSettings] = useState({
    language: 'English',
    region: 'Philippines',
    theme: 'Light',
  })

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
      setIsEditing(false) // Close edit mode on success
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
      const { data: authSession, error: sessionError } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      })

      if (sessionError) throw new Error(`Supabase session error: ${sessionError.message}`)
      if (!authSession?.session?.user) throw new Error('Supabase authentication session could not be established.')

      const filePath = `${session.user.id}/avatar.png`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

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
      // Ignore errors
    }
    localStorage.removeItem(SESSION_KEY)
    navigate('/login')
  }

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      {/* Top Header (Only visible when not loading) */}
      {!isLoading && profile && (
        <div className="profile-top-bar">
          <div>
            <h2 id="profile-title" className="page-title">Profile</h2>
          </div>
          <button className="profile-logout-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <p className="profile-state">Loading your profile...</p>}

      {!isLoading && profile && (
        <div className="profile-content">
          
          {/* Profile Header Card */}
          <div className="profile-card profile-header-card">
            <div className="profile-avatar-wrapper">
              {profile.avatar_url ? (
                <img className="profile-avatar-image" src={profile.avatar_url} alt="Your avatar" />
              ) : (
                <div className="profile-avatar-placeholder" aria-hidden="true">
                  {getInitials(profile.first_name, profile.last_name)}
                </div>
              )}
              <label className="profile-avatar-edit-badge">
                <span className="sr-only">Change photo</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  hidden
                />
              </label>
            </div>

            <div className="profile-header-info">
              <h3 className="profile-name">{profile.first_name} {profile.last_name}</h3>
              <p className="profile-email">{profile.email}</p>
              <p className="profile-phone">{profile.phone || 'No phone number added'}</p>
            </div>

            <button 
              className="profile-edit-toggle-btn" 
              onClick={() => setIsEditing(!isEditing)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Edit Form (Conditional) */}
          {isEditing && (
            <div className="profile-card profile-edit-form-card">
              <h3 className="card-title">Personal details</h3>
              <p className="card-subtitle">Only your name and phone number can be changed.</p>
              <form className="profile-fields" onSubmit={handleSubmit}>
                <div className="profile-form-row">
                  <label className="profile-field">
                    <span>First name</span>
                    <input name="first_name" type="text" value={form.first_name} onChange={handleChange} required />
                  </label>
                  <label className="profile-field">
                    <span>Last name</span>
                    <input name="last_name" type="text" value={form.last_name} onChange={handleChange} required />
                  </label>
                </div>
                <label className="profile-field">
                  <span>Phone number</span>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                </label>
                <button className="profile-save-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </div>
          )}

          {/* Activity History Card */}
          <div className="profile-card">
            <div className="card-header-row">
              <h3 className="card-title">Activity History</h3>
              <span className="card-icon">🕒</span>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon-wrapper bg-light-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F5A5A" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="activity-details">
                  <p className="activity-title">Reservation Completed</p>
                  <p className="activity-desc">Rose Pharmacy · Oct 24, 2023</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon-wrapper bg-light-green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F5A5A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <div className="activity-details">
                  <p className="activity-title">Prescription Pickup</p>
                  <p className="activity-desc">₱24.50 · Three Sixty Pharmacy · Oct 12, 2023</p>
                </div>
              </div>
            </div>
            <button className="card-link-btn">See All Activity</button>
          </div>

          {/* Notification Preferences Card */}
          <div className="profile-card">
            <div className="card-header-row">
              <h3 className="card-title">Notification Preferences</h3>
              <span className="card-icon">🔔</span>
            </div>
            
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <p className="setting-title">Push Notifications</p>
                  <p className="setting-desc">Get real-time prescription and pickup updates.</p>
                </div>
                <button 
                  className={`toggle-switch ${notifications.push ? 'active' : ''}`}
                  onClick={() => toggleNotification('push')}
                  aria-label="Toggle Push Notifications"
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <p className="setting-title">Email Alerts</p>
                  <p className="setting-desc">Receive monthly statements and order receipts.</p>
                </div>
                <button 
                  className={`toggle-switch ${notifications.email ? 'active' : ''}`}
                  onClick={() => toggleNotification('email')}
                  aria-label="Toggle Email Alerts"
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <p className="setting-title">SMS Updates</p>
                  <p className="setting-desc">SMS alerts for ready orders & reservations.</p>
                </div>
                <button 
                  className={`toggle-switch ${notifications.sms ? 'active' : ''}`}
                  onClick={() => toggleNotification('sms')}
                  aria-label="Toggle SMS Updates"
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </div>

          {/* App General Settings Card */}
          <div className="profile-card">
            <div className="card-header-row">
              <h3 className="card-title">App Settings</h3>
              <span className="card-icon">⚙️</span>
            </div>
            <div className="settings-list">
              <div className="setting-item setting-item-select">
                <div className="setting-info">
                  <p className="setting-title">Language</p>
                </div>
                <select 
                  className="setting-select"
                  value={appSettings.language}
                  onChange={(e) => setAppSettings({...appSettings, language: e.target.value})}
                >
                  <option>English</option>
                  <option>Filipino</option>
                  <option>Spanish</option>
                </select>
              </div>
              <div className="setting-item setting-item-select">
                <div className="setting-info">
                  <p className="setting-title">Region</p>
                </div>
                <select 
                  className="setting-select"
                  value={appSettings.region}
                  onChange={(e) => setAppSettings({...appSettings, region: e.target.value})}
                >
                  <option>Philippines</option>
                  <option>United States</option>
                  <option>Singapore</option>
                </select>
              </div>
              <div className="setting-item setting-item-select">
                <div className="setting-info">
                  <p className="setting-title">Theme</p>
                </div>
                <select 
                  className="setting-select"
                  value={appSettings.theme}
                  onChange={(e) => setAppSettings({...appSettings, theme: e.target.value})}
                >
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System Default</option>
                </select>
              </div>
            </div>
          </div>

          {/* PharmaLink AI Card */}
          <div className="profile-card ai-card">
            <div className="ai-card-header">
              <div className="ai-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="ai-title">PharmaLink AI</h3>
              <span className="ai-badge">ℹ️</span>
            </div>
            <p className="ai-desc">All assistance is for informational purposes. Consult a pharmacist.</p>
            <button className="ai-chat-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Start Chat Session
            </button>
          </div>

        </div>
      )}

      {/* Status Messages */}
      {status.message && (
        <p className={`profile-status ${status.type}`} role="status">{status.message}</p>
      )}
      
      {/* Fallback for not logged in */}
      {!isLoading && !profile && (
        <div className="profile-fallback">
          <Link className="profile-login-link" to="/login">Sign in or create an account</Link>
        </div>
      )}
    </section>
  )
}

export default ProfilePage