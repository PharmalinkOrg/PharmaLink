import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/useAuth'
import { useAppSettings } from '../context/AppSettingsContext'
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
  Type,
  Eye,
  EyeOff,
  Flag,
  Send,
  Search,
  X,
  CheckCircle2,
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

  const { signOut, accessToken } = useAuth()

  const {
    language,
    theme,
    textSize,
    setLanguage,
    setTheme,
    setTextSize,
  } = useAppSettings()

  const [profile, setProfile] = useState(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })

  const [status, setStatus] = useState(() =>
    getStoredSession()?.accessToken
      ? { type: '', message: '' }
      : {
          type: 'error',
          message: 'Sign in to view and edit your profile.',
        }
  )

  const [isLoading, setIsLoading] = useState(() =>
    Boolean(getStoredSession()?.accessToken)
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // ------------------------------------------------------------
  // Notification preferences
  // Functionality will be connected later.
  // ------------------------------------------------------------

  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  })

  // ------------------------------------------------------------
  // Password
  // ------------------------------------------------------------

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // ------------------------------------------------------------
  // Report an Issue
  // ------------------------------------------------------------

  const [isReporting, setIsReporting] = useState(false)

  const [pharmacies, setPharmacies] = useState([])
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(false)

  const [pharmacySearch, setPharmacySearch] = useState('')
  const [selectedPharmacy, setSelectedPharmacy] = useState(null)
  const [showPharmacySuggestions, setShowPharmacySuggestions] =
    useState(false)

  const [reportForm, setReportForm] = useState({
    subject: '',
    description: '',
  })

  const [reportStatus, setReportStatus] = useState({
    type: '',
    message: '',
  })

  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  // ------------------------------------------------------------
  // Load profile
  // ------------------------------------------------------------

  useEffect(() => {
    if (!accessToken) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    setIsLoading(true)

    apiRequest('/users/me/profile', {
      token: accessToken,
    })
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

  // ------------------------------------------------------------
  // Load pharmacies when Report form opens
  // ------------------------------------------------------------

  useEffect(() => {
    if (!isReporting || pharmacies.length > 0) {
      return
    }

    let cancelled = false

    const loadPharmacies = async () => {
      setIsLoadingPharmacies(true)

      try {
        const session = getStoredSession()

        const response = await apiRequest('/pharmacies', {
          token: session?.accessToken,
        })

        if (cancelled) return

        const pharmacyData = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.pharmacies)
            ? response.data.pharmacies
            : Array.isArray(response?.pharmacies)
              ? response.pharmacies
              : []

        setPharmacies(
          pharmacyData.filter(
            (pharmacy) =>
              !pharmacy.status ||
              pharmacy.status === 'ACTIVE'
          )
        )
      } catch (error) {
        if (cancelled) return

        setReportStatus({
          type: 'error',
          message:
            error.message ||
            'Unable to load partner pharmacies.',
        })
      } finally {
        if (!cancelled) {
          setIsLoadingPharmacies(false)
        }
      }
    }

    loadPharmacies()

    return () => {
      cancelled = true
    }
  }, [isReporting, pharmacies.length])

  // ------------------------------------------------------------
  // Filter pharmacy autocomplete
  // ------------------------------------------------------------

  const pharmacySuggestions = useMemo(() => {
    const query = pharmacySearch.trim().toLowerCase()

    if (!query || selectedPharmacy) {
      return []
    }

    return pharmacies
      .filter((pharmacy) => {
        const name = pharmacy.name?.toLowerCase() || ''
        const address = pharmacy.address?.toLowerCase() || ''

        return (
          name.includes(query) ||
          address.includes(query)
        )
      })
      .slice(0, 6)
  }, [pharmacies, pharmacySearch, selectedPharmacy])

  // ------------------------------------------------------------
  // Profile editing
  // ------------------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))

    setStatus({
      type: '',
      message: '',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const session = getStoredSession()

    setIsSaving(true)

    setStatus({
      type: '',
      message: '',
    })

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

      setStatus({
        type: 'success',
        message: 'Your profile has been saved.',
      })

      setIsEditing(false)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ------------------------------------------------------------
  // Avatar
  // ------------------------------------------------------------

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    const session = getStoredSession()

    if (!session?.accessToken || !session?.user?.id) {
      setStatus({
        type: 'error',
        message: 'Sign in again to update your avatar.',
      })

      return
    }

    setIsUploadingAvatar(true)

    setStatus({
      type: '',
      message: '',
    })

    try {
      const {
        data: authSession,
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      })

      if (sessionError) {
        throw new Error(
          `Supabase session error: ${sessionError.message}`
        )
      }

      if (!authSession?.session?.user) {
        throw new Error(
          'Supabase authentication session could not be established.'
        )
      }

      const filePath = `${session.user.id}/avatar.png`

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } =
        supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

      const response = await apiRequest('/users/me/profile', {
        token: session.accessToken,
        method: 'PATCH',
        body: {
          ...form,
          avatar_url: publicUrlData.publicUrl,
        },
      })

      setProfile(response.data)

      setStatus({
        type: 'success',
        message: 'Your avatar has been updated.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.message ||
          'Failed to upload avatar.',
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // ------------------------------------------------------------
  // Password
  // ------------------------------------------------------------

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

    setStatus({
      type: '',
      message: '',
    })
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    const session = getStoredSession()

    if (
      !session?.accessToken ||
      !session?.refreshToken ||
      !profile?.email
    ) {
      setStatus({
        type: 'error',
        message:
          'Please sign in again before changing your password.',
      })

      return
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setStatus({
        type: 'error',
        message:
          'New password and confirmation do not match.',
      })

      return
    }

    const passwordError =
      validateNewPassword(passwordForm.newPassword)

    if (passwordError) {
      setStatus({
        type: 'error',
        message: passwordError,
      })

      return
    }

    if (
      passwordForm.currentPassword ===
      passwordForm.newPassword
    ) {
      setStatus({
        type: 'error',
        message:
          'Your new password must be different from your current password.',
      })

      return
    }

    setIsUpdatingPassword(true)

    setStatus({
      type: '',
      message: '',
    })

    try {
      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email: profile.email,
          password: passwordForm.currentPassword,
        })

      if (verificationError) {
        throw new Error(
          'Your current password is incorrect.'
        )
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
        message:
          'Your password has been changed successfully.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.message ||
          'Unable to change your password.',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // ------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------

  const handleLogout = async () => {
    await signOut()

    setProfile(null)

    setForm({
      first_name: '',
      last_name: '',
      phone: '',
    })

    navigate('/login', {
      replace: true,
    })
  }

  const toggleNotification = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // ------------------------------------------------------------
  // Report form
  // ------------------------------------------------------------

  const resetReportForm = () => {
    setPharmacySearch('')
    setSelectedPharmacy(null)

    setReportForm({
      subject: '',
      description: '',
    })

    setShowPharmacySuggestions(false)

    setReportStatus({
      type: '',
      message: '',
    })
  }

  const handleToggleReport = () => {
    if (isReporting) {
      resetReportForm()
    }

    setIsReporting((current) => !current)
  }

  const handlePharmacySearchChange = (event) => {
    const value = event.target.value

    setPharmacySearch(value)
    setSelectedPharmacy(null)

    setShowPharmacySuggestions(
      Boolean(value.trim())
    )

    setReportStatus({
      type: '',
      message: '',
    })
  }

  const handleSelectPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy)
    setPharmacySearch(pharmacy.name || '')
    setShowPharmacySuggestions(false)

    setReportStatus({
      type: '',
      message: '',
    })
  }

  const handleClearPharmacy = () => {
    setSelectedPharmacy(null)
    setPharmacySearch('')
    setShowPharmacySuggestions(false)

    setReportStatus({
      type: '',
      message: '',
    })
  }

  const handleReportChange = (event) => {
    const { name, value } = event.target

    setReportForm((current) => ({
      ...current,
      [name]: value,
    }))

    setReportStatus({
      type: '',
      message: '',
    })
  }

  const handleReportSubmit = async (event) => {
    event.preventDefault()

    const session = getStoredSession()

    if (!session?.accessToken) {
      setReportStatus({
        type: 'error',
        message:
          'Please sign in again before submitting a report.',
      })

      return
    }

    if (!selectedPharmacy?.pharmacy_id) {
      setReportStatus({
        type: 'error',
        message:
          'Please select a PharmaLink partner pharmacy from the suggestions.',
      })

      return
    }

    const description =
      reportForm.description.trim()

    if (!description) {
      setReportStatus({
        type: 'error',
        message:
          'Please describe your concern or feedback.',
      })

      return
    }

    setIsSubmittingReport(true)

    setReportStatus({
      type: '',
      message: '',
    })

    try {
      await apiRequest('/reports', {
        token: session.accessToken,
        method: 'POST',
        body: {
          pharmacy_id:
            selectedPharmacy.pharmacy_id,

          subject:
            reportForm.subject.trim() || null,

          description,
        },
      })

      const pharmacyName =
        selectedPharmacy.name

      setPharmacySearch('')
      setSelectedPharmacy(null)

      setReportForm({
        subject: '',
        description: '',
      })

      setShowPharmacySuggestions(false)

      setReportStatus({
        type: 'success',
        message: `Your report has been sent to ${pharmacyName}.`,
      })
    } catch (error) {
      setReportStatus({
        type: 'error',
        message:
          error.message ||
          'Unable to submit your report. Please try again.',
      })
    } finally {
      setIsSubmittingReport(false)
    }
  }

  return (
    <section
      className="profile-page-v2 min-h-screen pb-24 px-4 pt-6"
      aria-labelledby="profile-title"
    >
      {/* Top Header */}
      {!isLoading && profile && (
        <div className="flex justify-between items-center mb-6">
          <h2
            id="profile-title"
            className="text-2xl font-bold text-gray-900"
          >
            Profile
          </h2>

          <button
            type="button"
            onClick={handleLogout}
            className="profile-logout-button flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-gray-500">
            Loading your profile...
          </p>
        </div>
      )}

      {!isLoading && profile && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto">

          {/* =====================================================
              PROFILE HEADER
          ====================================================== */}

          <div className="profile-main-card rounded-2xl p-6 flex flex-col items-center">
            <div className="relative mb-4">
              {profile.avatar_url ? (
                <img
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                  src={profile.avatar_url}
                  alt="Your avatar"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-teal-700 text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md">
                  {getInitials(
                    profile.first_name,
                    profile.last_name
                  )}
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
                {profile.first_name}{' '}
                {profile.last_name}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {profile.email}
              </p>

              <p className="text-sm text-gray-500">
                {profile.phone ||
                  'No phone number added'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsEditing(!isEditing)
              }
              className="profile-secondary-button flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors"
            >
              <Pencil size={16} />

              {isEditing
                ? 'Cancel Edit'
                : 'Edit Profile'}
            </button>
          </div>

          {/* =====================================================
              EDIT PROFILE
          ====================================================== */}

          {isEditing && (
            <div className="profile-edit-card rounded-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-1">
                Personal details
              </h3>

              <p className="text-xs text-gray-500 mb-4">
                Only your name and phone number can be
                changed.
              </p>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">
                      First name
                    </span>

                    <input
                      name="first_name"
                      type="text"
                      value={form.first_name}
                      onChange={handleChange}
                      required
                      className="profile-input px-3 py-2.5 rounded-lg text-sm transition-all"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">
                      Last name
                    </span>

                    <input
                      name="last_name"
                      type="text"
                      value={form.last_name}
                      onChange={handleChange}
                      required
                      className="profile-input px-3 py-2.5 rounded-lg text-sm transition-all"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">
                    Phone number
                  </span>

                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    className="profile-input px-3 py-2.5 rounded-lg text-sm transition-all"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="profile-primary-button mt-2 w-full py-3 rounded-xl font-semibold text-sm disabled:cursor-not-allowed"
                >
                  {isSaving
                    ? 'Saving...'
                    : 'Save changes'}
                </button>
              </form>
            </div>
          )}

          {/* =====================================================
              ACCOUNT & SECURITY
          ====================================================== */}

          <div className="profile-section-card profile-security-card rounded-2xl p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Account & Security
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Manage your sign-in and account
                  security.
                </p>
              </div>

              <ShieldCheck
                size={19}
                className="text-teal-700"
              />
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
                setIsChangingPassword(
                  (current) => !current
                )

                setStatus({
                  type: '',
                  message: '',
                })
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
                  isChangingPassword
                    ? 'rotate-90'
                    : ''
                }`}
              />
            </button>

            {isChangingPassword && (
              <form
                onSubmit={handlePasswordSubmit}
                className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-4"
              >
                {[
                  [
                    'currentPassword',
                    'Current password',
                  ],
                  [
                    'newPassword',
                    'New password',
                  ],
                  [
                    'confirmPassword',
                    'Confirm new password',
                  ],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex flex-col gap-1.5"
                  >
                    <span className="text-xs font-semibold text-gray-700">
                      {label}
                    </span>

                    <div className="relative">
                      <input
                        name={name}
                        type={
                          showPasswords
                            ? 'text'
                            : 'password'
                        }
                        value={passwordForm[name]}
                        onChange={
                          handlePasswordChange
                        }
                        required
                        minLength={
                          name ===
                          'currentPassword'
                            ? undefined
                            : 8
                        }
                        autoComplete={
                          name ===
                          'currentPassword'
                            ? 'current-password'
                            : 'new-password'
                        }
                        className="profile-input w-full px-3 py-2.5 pr-11 rounded-lg text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords(
                            (current) =>
                              !current
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                        aria-label={
                          showPasswords
                            ? 'Hide passwords'
                            : 'Show passwords'
                        }
                      >
                        {showPasswords ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </label>
                ))}

                <p className="text-xs text-gray-500 leading-relaxed">
                  Minimum 8 characters with one
                  uppercase letter, one number, and one
                  special character.
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
                    className="profile-secondary-button flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="profile-primary-button flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    {isUpdatingPassword
                      ? 'Updating...'
                      : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* =====================================================
              NOTIFICATION PREFERENCES
          ====================================================== */}

          <div className="profile-section-card profile-notifications-card rounded-2xl p-5">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Notification Preferences
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Choose how you would like to receive
                  PharmaLink updates.
                </p>
              </div>

              <Bell
                size={18}
                className="text-teal-700"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Push Notifications
                  </p>

                  <p className="text-xs text-gray-500 leading-tight">
                    Get real-time prescription and
                    pickup updates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleNotification('push')
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.push
                      ? 'bg-teal-700'
                      : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Push Notifications"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.push
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Email Alerts
                  </p>

                  <p className="text-xs text-gray-500 leading-tight">
                    Receive monthly statements and
                    order receipts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleNotification('email')
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.email
                      ? 'bg-teal-700'
                      : 'bg-gray-300'
                  }`}
                  aria-label="Toggle Email Alerts"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.email
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    SMS Updates
                  </p>

                  <p className="text-xs text-gray-500 leading-tight">
                    SMS alerts for ready orders &
                    reservations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleNotification('sms')
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    notifications.sms
                      ? 'bg-teal-700'
                      : 'bg-gray-300'
                  }`}
                  aria-label="Toggle SMS Updates"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.sms
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================
              APP SETTINGS
          ====================================================== */}

          <div className="profile-settings-card bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  App Settings
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Personalize your PharmaLink
                  experience.
                </p>
              </div>

              <Settings
                size={18}
                className="text-teal-700"
              />
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
                      Additional languages coming
                      later
                    </p>
                  </div>
                </div>

                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(
                      event.target.value
                    )
                  }
                  className="profile-settings-select"
                  aria-label="Application language"
                  disabled
                >
                  <option value="en">
                    English
                  </option>
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
                  value={theme}
                  onChange={(event) =>
                    setTheme(event.target.value)
                  }
                  className="profile-settings-select"
                  aria-label="Application theme"
                >
                  <option value="light">
                    Light
                  </option>

                  <option value="dark">
                    Dark
                  </option>

                  <option value="system">
                    System Default
                  </option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-4 py-4 last:pb-0">
                <div className="flex items-center gap-3">
                  <Type
                    size={17}
                    className="text-teal-700"
                  />

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
                  value={textSize}
                  onChange={(event) =>
                    setTextSize(
                      event.target.value
                    )
                  }
                  className="profile-settings-select"
                  aria-label="Application text size"
                >
                  <option value="small">
                    Small
                  </option>

                  <option value="default">
                    Default
                  </option>

                  <option value="large">
                    Large
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =====================================================
              PRIVACY & SUPPORT
          ====================================================== */}

          <div className="profile-section-card profile-support-card rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Privacy & Support
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Learn more about PharmaLink and get
                  help.
                </p>
              </div>

              <HelpCircle
                size={18}
                className="text-teal-700"
              />
            </div>

            <div className="divide-y divide-gray-100">

              {/* Privacy */}

              <button
                type="button"
                onClick={() =>
                  navigate('/privacy')
                }
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Privacy & Data
                  </p>

                  <p className="text-xs text-gray-500 mt-0.5">
                    Learn how your information is
                    handled.
                  </p>
                </div>

                <ChevronRight
                  size={17}
                  className="text-gray-400"
                />
              </button>

              {/* Help */}

              <button
                type="button"
                onClick={() =>
                  navigate('/support')
                }
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

                <ChevronRight
                  size={17}
                  className="text-gray-400"
                />
              </button>

              {/* =================================================
                  REPORT AN ISSUE
              ================================================== */}

              <div>
                <button
                  type="button"
                  onClick={handleToggleReport}
                  className="w-full py-4 flex items-center justify-between text-left"
                  aria-expanded={isReporting}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                      <Flag size={17} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Report an Issue
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        Send a concern or feedback to
                        a partner pharmacy.
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    className={`text-gray-400 transition-transform ${
                      isReporting
                        ? 'rotate-90'
                        : ''
                    }`}
                  />
                </button>

                {isReporting && (
                  <div className="pb-5 pt-1">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-gray-900">
                          Send a Report
                        </h4>

                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          Select the partner pharmacy
                          you want to contact and
                          describe your concern or
                          feedback.
                        </p>
                      </div>

                      <form
                        onSubmit={
                          handleReportSubmit
                        }
                        className="flex flex-col gap-4"
                      >
                        {/* Pharmacy */}

                        <div>
                          <label
                            htmlFor="report-pharmacy"
                            className="block text-xs font-semibold text-gray-700 mb-1.5"
                          >
                            Pharmacy{' '}
                            <span className="text-red-500">
                              *
                            </span>
                          </label>

                          <div className="relative">
                            <Search
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />

                            <input
                              id="report-pharmacy"
                              type="text"
                              value={
                                pharmacySearch
                              }
                              onChange={
                                handlePharmacySearchChange
                              }
                              onFocus={() => {
                                if (
                                  pharmacySearch.trim() &&
                                  !selectedPharmacy
                                ) {
                                  setShowPharmacySuggestions(
                                    true
                                  )
                                }
                              }}
                              placeholder="Type a pharmacy name..."
                              autoComplete="off"
                              className="profile-input w-full pl-9 pr-10 py-2.5 rounded-lg text-sm"
                            />

                            {pharmacySearch && (
                              <button
                                type="button"
                                onClick={
                                  handleClearPharmacy
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                aria-label="Clear selected pharmacy"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>

                          {selectedPharmacy && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-emerald-700">
                              <CheckCircle2
                                size={15}
                                className="mt-0.5 flex-shrink-0"
                              />

                              <div>
                                <span className="font-semibold">
                                  Partner pharmacy
                                  selected
                                </span>

                                {selectedPharmacy.address && (
                                  <p className="text-gray-500 mt-0.5">
                                    {
                                      selectedPharmacy.address
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {isLoadingPharmacies && (
                            <p className="text-xs text-gray-500 mt-2">
                              Loading partner
                              pharmacies...
                            </p>
                          )}

                          {showPharmacySuggestions &&
                            !isLoadingPharmacies &&
                            pharmacySuggestions.length >
                              0 && (
                              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                {pharmacySuggestions.map(
                                  (
                                    pharmacy
                                  ) => (
                                    <button
                                      key={
                                        pharmacy.pharmacy_id
                                      }
                                      type="button"
                                      onClick={() =>
                                        handleSelectPharmacy(
                                          pharmacy
                                        )
                                      }
                                      className="w-full px-3 py-3 text-left border-b border-gray-100 last:border-b-0 hover:bg-teal-50 transition-colors"
                                    >
                                      <p className="text-sm font-semibold text-gray-900">
                                        {
                                          pharmacy.name
                                        }
                                      </p>

                                      {pharmacy.address && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {
                                            pharmacy.address
                                          }
                                        </p>
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            )}

                          {showPharmacySuggestions &&
                            pharmacySearch.trim() &&
                            !isLoadingPharmacies &&
                            pharmacySuggestions.length ===
                              0 &&
                            !selectedPharmacy && (
                              <div className="mt-2 px-3 py-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <p className="text-xs text-amber-800 leading-relaxed">
                                  We couldn't find that
                                  pharmacy among our
                                  current PharmaLink
                                  partners. Please
                                  choose a partner
                                  pharmacy.
                                </p>
                              </div>
                            )}
                        </div>

                        {/* Subject */}

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            Subject{' '}
                            <span className="font-normal text-gray-400">
                              (Optional)
                            </span>
                          </span>

                          <input
                            name="subject"
                            type="text"
                            value={
                              reportForm.subject
                            }
                            onChange={
                              handleReportChange
                            }
                            placeholder="Brief subject..."
                            maxLength={150}
                            className="profile-input px-3 py-2.5 rounded-lg text-sm"
                          />
                        </label>

                        {/* Description */}

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            Description{' '}
                            <span className="text-red-500">
                              *
                            </span>
                          </span>

                          <textarea
                            name="description"
                            value={
                              reportForm.description
                            }
                            onChange={
                              handleReportChange
                            }
                            placeholder="Describe your concern or feedback..."
                            required
                            rows={5}
                            maxLength={2000}
                            className="profile-input px-3 py-2.5 rounded-lg text-sm resize-y"
                          />

                          <span className="text-[11px] text-gray-400 text-right">
                            {
                              reportForm.description
                                .length
                            }
                            /2000
                          </span>
                        </label>

                        {/* Report status */}

                        {reportStatus.message && (
                          <div
                            className={`p-3 rounded-lg text-xs leading-relaxed ${
                              reportStatus.type ===
                              'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                : 'bg-red-50 text-red-800 border border-red-100'
                            }`}
                            role="status"
                          >
                            {
                              reportStatus.message
                            }
                          </div>
                        )}

                        {/* Actions */}

                        <div className="flex gap-3 pt-1">
                          <button
                            type="button"
                            onClick={
                              handleToggleReport
                            }
                            disabled={
                              isSubmittingReport
                            }
                            className="profile-secondary-button flex-1 py-2.5 rounded-xl text-sm font-semibold"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={
                              isSubmittingReport
                            }
                            className="profile-primary-button flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                          >
                            <Send size={15} />

                            {isSubmittingReport
                              ? 'Submitting...'
                              : 'Submit Report'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* About */}

              <button
                type="button"
                onClick={() =>
                  navigate('/about')
                }
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    About PharmaLink
                  </p>

                  <p className="text-xs text-gray-500 mt-0.5">
                    Application information and
                    version.
                  </p>
                </div>

                <ChevronRight
                  size={17}
                  className="text-gray-400"
                />
              </button>
            </div>
          </div>

          {/* =====================================================
              PHARMALINK AI
          ====================================================== */}

          <div className="profile-ai-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>

              <h3 className="text-base font-bold flex-1">
                PharmaLink AI
              </h3>

              <Info
                size={16}
                className="opacity-70"
              />
            </div>

            <p className="text-xs opacity-80 mb-4 leading-relaxed">
              All assistance is for informational
              purposes. Consult a pharmacist.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/assistant')
              }
              className="profile-ai-button w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} />
              Start Chat Session
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          GLOBAL STATUS
      ========================================================== */}

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

      {/* =========================================================
          NOT LOGGED IN
      ========================================================== */}

      {!isLoading && !profile && (
        <div className="flex justify-center py-20">
          <Link
            to="/login"
            className="text-teal-700 font-semibold hover:underline"
          >
            Sign in or create an account
          </Link>
        </div>
      )}
    </section>
  )
}

export default ProfilePage