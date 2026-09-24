import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/useAuth'
import {
  Pencil,
  Bell,
  Settings,
  MessageSquare,
  Info,
  LogOut,
  LockKeyhole,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
  MapPin,
  Type,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react'
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
  const { signOut, accessToken, refreshToken, user } = useAuth()
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

  // Notification functionality will be connected later.
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  })

  const [appSettings, setAppSettings] = useState({
    language: 'English',
    theme: 'Light',
    textSize: 'Default',
    preferredPharmacy: '',
    locationAccess: false,
  })

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!accessToken) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    setIsLoading(true)

    apiRequest('/users/me/profile', { token: accessToken })
      .then((response) => {
        if (cancelled) return

        const nextProfile = response.data

        setProfile(nextProfile)
        setForm({
          first_name: nextProfile.first_name || '',
          last_name: nextProfile.last_name || '',
          phone: nextProfile.phone || '',
        })
      })
      .catch((error) => {
        if (cancelled) return

        setProfile(null)
        setStatus({
          type: 'error',
          message: error.message,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken])

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
      setIsEditing(false)
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

  const validateNewPassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.'
    }

    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.'
    }

    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number.'
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character.'
    }

    return ''
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))

    setStatus({ type: '', message: '' })
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    const session = getStoredSession()

    if (!session?.accessToken || !session?.refreshToken || !profile?.email) {
      setStatus({
        type: 'error',
        message: 'Please sign in again before changing your password.',
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({
        type: 'error',
        message: 'New password and confirmation do not match.',
      })
      return
    }

    const passwordError = validateNewPassword(passwordForm.newPassword)

    if (passwordError) {
      setStatus({
        type: 'error',
        message: passwordError,
      })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setStatus({
        type: 'error',
        message: 'Your new password must be different from your current password.',
      })
      return
    }

    setIsUpdatingPassword(true)
    setStatus({ type: '', message: '' })

    try {
      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email: profile.email,
          password: passwordForm.currentPassword,
        })

      if (verificationError) {
        throw new Error('Your current password is incorrect.')
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: passwordForm.newPassword,
        })

      if (updateError) {
        throw updateError
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setIsChangingPassword(false)
      setShowPasswords(false)

      setStatus({
        type: 'success',
        message: 'Your password has been changed successfully.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to change your password.',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleLogout = async () => {
    await signOut()

    setProfile(null)
    setForm({
      first_name: '',
      last_name: '',
      phone: '',
    })

    navigate('/login', { replace: true })
  }

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section className="min-h-screen bg-gray-50 pb-24 px-4 pt-6" aria-labelledby="profile-title">
      {/* Top Header */}
      {!isLoading && profile && (
        <div className="flex justify-between items-center mb-6">
          <h2 id="profile-title" className="text-2xl font-bold text-gray-900">
            Profile
          </h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      )}

      {!isLoading && profile && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="relative mb-4">
              {profile.avatar_url ? (
                <img
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                  src={profile.avatar_url}
                  alt="Your avatar"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-teal-700 text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md">
                  {getInitials(profile.first_name, profile.last_name)}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-teal-700 text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                <Pencil size={12} />
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  hidden
                />
              </label>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
              <p className="text-sm text-gray-500">{profile.phone || 'No phone number added'}</p>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-300 rounded-xl text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
            >
              <Pencil size={16} />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Edit Form (Conditional) */}
          {isEditing && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-1">Personal details</h3>
              <p className="text-xs text-gray-500 mb-4">Only your name and phone number can be changed.</p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">First name</span>
                    <input
                      name="first_name"
                      type="text"
                      value={form.first_name}
                      onChange={handleChange}
                      required
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">Last name</span>
                    <input
                      name="last_name"
                      type="text"
                      value={form.last_name}
                      onChange={handleChange}
                      required
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Phone number</span>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 w-full py-3 bg-teal-700 text-white rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </div>
          )}

          {/* Account & Security */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Account & Security
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage your sign-in and account security.
                </p>
              </div>

              <ShieldCheck size={19} className="text-teal-700" />
            </div>

            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Email Address
                </p>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  {profile.email}
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Account
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsChangingPassword((current) => !current)
                setStatus({ type: '', message: '' })
              }}
              className="w-full flex items-center justify-between gap-3 pt-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center">
                  <LockKeyhole size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Change Password
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your account password.
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className={`text-gray-400 transition-transform ${
                  isChangingPassword ? 'rotate-90' : ''
                }`}
              />
            </button>

            {isChangingPassword && (
              <form
                onSubmit={handlePasswordSubmit}
                className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-4"
              >
                {[
                  ['currentPassword', 'Current password'],
                  ['newPassword', 'New password'],
                  ['confirmPassword', 'Confirm new password'],
                ].map(([name, label]) => (
                  <label key={name} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">
                      {label}
                    </span>

                    <div className="relative">
                      <input
                        name={name}
                        type={showPasswords ? 'text' : 'password'}
                        value={passwordForm[name]}
                        onChange={handlePasswordChange}
                        required
                        minLength={name === 'currentPassword' ? undefined : 8}
                        autoComplete={
                          name === 'currentPassword'
                            ? 'current-password'
                            : 'new-password'
                        }
                        className="w-full px-3 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                        aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </label>
                ))}

                <p className="text-xs text-gray-500 leading-relaxed">
                  Minimum 8 characters with one uppercase letter,
                  one number, and one special character.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false)
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      })
                    }}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex-1 py-2.5 bg-teal-700 text-white rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-60"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Notification Preferences Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Notification Preferences
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Choose how you would like to receive PharmaLink updates.
                </p>
              </div>

              <Bell size={18} className="text-teal-700" />
            </div>
            <div className="flex flex-col gap-5">
              {/* Push */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Push Notifications</p>
                  <p className="text-xs text-gray-500 leading-tight">Get real-time prescription and pickup updates.</p>
                </div>
                <button
                  onClick={() => toggleNotification('push')}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.push ? 'bg-teal-700' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Push Notifications"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.push ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Email */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Email Alerts</p>
                  <p className="text-xs text-gray-500 leading-tight">Receive monthly statements and order receipts.</p>
                </div>
                <button
                  onClick={() => toggleNotification('email')}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.email ? 'bg-teal-700' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Email Alerts"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.email ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* SMS */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">SMS Updates</p>
                  <p className="text-xs text-gray-500 leading-tight">SMS alerts for ready orders & reservations.</p>
                </div>
                <button
                  onClick={() => toggleNotification('sms')}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.sms ? 'bg-teal-700' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle SMS Updates"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.sms ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* App Settings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  App Settings
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Personalize your PharmaLink experience.
                </p>
              </div>

              <Settings size={18} className="text-teal-700" />
            </div>

            <div className="flex flex-col divide-y divide-gray-100">
              <div className="flex justify-between items-center gap-4 py-4 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Language
                    </p>
                    <p className="text-xs text-gray-500">
                      Application language
                    </p>
                  </div>
                </div>

                <select
                  value={appSettings.language}
                  onChange={(event) =>
                    setAppSettings({
                      ...appSettings,
                      language: event.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option>English</option>
                  <option>Filipino</option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Theme
                  </p>
                  <p className="text-xs text-gray-500">
                    Choose your preferred appearance
                  </p>
                </div>

                <select
                  value={appSettings.theme}
                  onChange={(event) =>
                    setAppSettings({
                      ...appSettings,
                      theme: event.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System Default</option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-4 py-4">
                <div className="flex items-center gap-3">
                  <Type size={17} className="text-teal-700" />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Text Size
                    </p>
                    <p className="text-xs text-gray-500">
                      Improve readability
                    </p>
                  </div>
                </div>

                <select
                  value={appSettings.textSize}
                  onChange={(event) =>
                    setAppSettings({
                      ...appSettings,
                      textSize: event.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option>Small</option>
                  <option>Default</option>
                  <option>Large</option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-4 py-4">
                <div className="flex items-center gap-3">
                  <Building2 size={17} className="text-teal-700" />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Preferred Pharmacy
                    </p>
                    <p className="text-xs text-gray-500">
                      Default pharmacy for future actions
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/pharmacies')}
                  className="flex items-center gap-1 text-sm font-semibold text-teal-700"
                >
                  {appSettings.preferredPharmacy || 'Choose'}
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex justify-between items-center gap-4 py-4 last:pb-0">
                <div className="flex items-center gap-3">
                  <MapPin size={17} className="text-teal-700" />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Location Access
                    </p>
                    <p className="text-xs text-gray-500">
                      Help find nearby pharmacies
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAppSettings((current) => ({
                      ...current,
                      locationAccess: !current.locationAccess,
                    }))
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    appSettings.locationAccess ? 'bg-teal-700' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle location access"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      appSettings.locationAccess ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Support */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Privacy & Support
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Learn more about PharmaLink and get help.
                </p>
              </div>

              <HelpCircle size={18} className="text-teal-700" />
            </div>

            <div className="divide-y divide-gray-100">
              <button
                type="button"
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Privacy & Data
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Learn how your information is handled.
                  </p>
                </div>

                <ChevronRight size={17} className="text-gray-400" />
              </button>

              <button
                type="button"
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Help & Support
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Get help using PharmaLink.
                  </p>
                </div>

                <ChevronRight size={17} className="text-gray-400" />
              </button>

              <button
                type="button"
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    About PharmaLink
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Application information and version.
                  </p>
                </div>

                <ChevronRight size={17} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* PharmaLink AI Card */}
          <div className="bg-[#0B2B2B] rounded-2xl p-5 shadow-sm text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <h3 className="text-base font-bold flex-1">PharmaLink AI</h3>
              <Info size={16} className="opacity-70" />
            </div>
            <p className="text-xs opacity-80 mb-4 leading-relaxed">
              All assistance is for informational purposes. Consult a pharmacist.
            </p>
            <button
              type="button"
              onClick={() => navigate('/assistant')}
              className="w-full py-3 bg-emerald-100 text-teal-800 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} />
              Start Chat Session
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {status.message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm text-center max-w-lg mx-auto ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-800'
          }`}
          role="status"
        >
          {status.message}
        </div>
      )}

      {/* Fallback for not logged in */}
      {!isLoading && !profile && (
        <div className="flex justify-center py-20">
          <Link to="/login" className="text-teal-700 font-semibold hover:underline">
            Sign in or create an account
          </Link>
        </div>
      )}
    </section>
  )
}

export default ProfilePage