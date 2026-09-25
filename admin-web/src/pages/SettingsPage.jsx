import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import './SettingsPage.css'

function SettingsPage() {
  const { user, accessToken } = useAuth()

  const [activeTab, setActiveTab] = useState('profile')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Profile settings
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password change
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Pharmacy settings
  const [pharmacySettings, setPharmacySettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    operating_hours: '',
    description: '',
  })
  const [isUpdatingPharmacy, setIsUpdatingPharmacy] = useState(false)

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_new_reservations: true,
    email_new_prescriptions: true,
    email_low_stock: true,
    email_medicine_requests: true,
    email_reports: true,
    sms_new_reservations: false,
    sms_low_stock: false,
    push_new_reservations: true,
    push_new_prescriptions: true,
    push_low_stock: true,
  })
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false)

  // Alert thresholds
  const [alertSettings, setAlertSettings] = useState({
    low_stock_threshold: 10,
    critical_stock_threshold: 5,
    expiry_alert_days: 30,
  })
  const [isUpdatingAlerts, setIsUpdatingAlerts] = useState(false)

  // --------------------------------------------------
  // Load user profile and pharmacy data
  // --------------------------------------------------

  useEffect(() => {
    if (!accessToken || !user) return

    // Load user profile
    setProfile({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
    })

    // Load pharmacy settings
    loadPharmacySettings()
    loadNotificationSettings()
    loadAlertSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user])

  // --------------------------------------------------
  // Load functions
  // --------------------------------------------------

  const loadPharmacySettings = async () => {
    try {
      const response = await apiRequest('/pharmacies/me', {
        token: accessToken,
      })
      const pharmacy = response.data
      setPharmacySettings({
        name: pharmacy.name || '',
        address: pharmacy.address || '',
        phone: pharmacy.phone || '',
        email: pharmacy.email || '',
        operating_hours: pharmacy.operating_hours || '',
        description: pharmacy.description || '',
      })
    } catch (err) {
      console.error('Failed to load pharmacy settings:', err)
    }
  }

  const loadNotificationSettings = async () => {
    try {
      const response = await apiRequest('/settings/notifications', {
        token: accessToken,
      })
      if (response.data) {
        setNotifications({ ...notifications, ...response.data })
      }
    } catch (err) {
      // Settings might not exist yet, use defaults
      console.log('Using default notification settings')
    }
  }

  const loadAlertSettings = async () => {
    try {
      const response = await apiRequest('/settings/alerts', {
        token: accessToken,
      })
      if (response.data) {
        setAlertSettings({ ...alertSettings, ...response.data })
      }
    } catch (err) {
      // Settings might not exist yet, use defaults
      console.log('Using default alert settings')
    }
  }

  // --------------------------------------------------
  // Update profile
  // --------------------------------------------------

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsUpdatingProfile(true)

    try {
      const response = await apiRequest('/users/profile', {
        method: 'PUT',
        token: accessToken,
        body: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        },
      })

      setSuccessMessage(response.message || 'Profile updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // --------------------------------------------------
  // Change password
  // --------------------------------------------------

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await apiRequest('/auth/change-password', {
        method: 'POST',
        token: accessToken,
        body: {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        },
      })

      setSuccessMessage(response.message || 'Password changed successfully')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // --------------------------------------------------
  // Update pharmacy settings
  // --------------------------------------------------

  const handleUpdatePharmacy = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsUpdatingPharmacy(true)

    try {
      const response = await apiRequest('/pharmacies/settings', {
        method: 'PUT',
        token: accessToken,
        body: pharmacySettings,
      })

      setSuccessMessage(
        response.message || 'Pharmacy settings updated successfully'
      )
    } catch (err) {
      setError(err.message || 'Failed to update pharmacy settings')
    } finally {
      setIsUpdatingPharmacy(false)
    }
  }

  // --------------------------------------------------
  // Update notification settings
  // --------------------------------------------------

  const handleUpdateNotifications = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsUpdatingNotifications(true)

    try {
      const response = await apiRequest('/settings/notifications', {
        method: 'PUT',
        token: accessToken,
        body: notifications,
      })

      setSuccessMessage(
        response.message || 'Notification settings updated successfully'
      )
    } catch (err) {
      setError(err.message || 'Failed to update notification settings')
    } finally {
      setIsUpdatingNotifications(false)
    }
  }

  // --------------------------------------------------
  // Update alert settings
  // --------------------------------------------------

  const handleUpdateAlerts = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsUpdatingAlerts(true)

    try {
      const response = await apiRequest('/settings/alerts', {
        method: 'PUT',
        token: accessToken,
        body: alertSettings,
      })

      setSuccessMessage(
        response.message || 'Alert settings updated successfully'
      )
    } catch (err) {
      setError(err.message || 'Failed to update alert settings')
    } finally {
      setIsUpdatingAlerts(false)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Account Management</span>
          <h2 className="page-title">Settings</h2>
          <p className="page-copy">
            Manage your profile, pharmacy information, and notification preferences.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="form-success" role="status">
          {successMessage}
        </p>
      )}

      <div className="settings-container">
        {/* Tabs */}
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile')
              setError('')
              setSuccessMessage('')
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </button>

          <button
            type="button"
            className={`settings-tab ${activeTab === 'pharmacy' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('pharmacy')
              setError('')
              setSuccessMessage('')
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Pharmacy
          </button>

          <button
            type="button"
            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('notifications')
              setError('')
              setSuccessMessage('')
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notifications
          </button>

          <button
            type="button"
            className={`settings-tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('alerts')
              setError('')
              setSuccessMessage('')
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Alerts
          </button>

          <button
            type="button"
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('security')
              setError('')
              setSuccessMessage('')
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Security
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-panel">
              <h3 className="panel-title">Personal Information</h3>
              <p className="panel-description">
                Update your personal details and contact information.
              </p>

              <form className="settings-form" onSubmit={handleUpdateProfile}>
                <div className="form-row">
                  <label>
                    <span className="label-text">First Name</span>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                      required
                    />
                  </label>

                  <label>
                    <span className="label-text">Last Name</span>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>

                <label>
                  <span className="label-text">Email Address</span>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    title="Email cannot be changed"
                  />
                  <small className="input-hint">
                    Email address cannot be changed. Contact support if needed.
                  </small>
                </label>

                <label>
                  <span className="label-text">Phone Number</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    placeholder="+63 xxx xxx xxxx"
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>

              <div className="settings-section-divider" />

              <h3 className="panel-title">Account Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">User ID</span>
                  <span className="info-value">{user?.user_id || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value">
                    {user?.role === 'PHARMACY_ADMIN'
                      ? 'Pharmacy Admin'
                      : user?.role === 'PHARMACY_STAFF'
                      ? 'Pharmacy Staff'
                      : user?.role || '—'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Pharmacy ID</span>
                  <span className="info-value">{user?.pharmacy_id || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pharmacy Tab */}
          {activeTab === 'pharmacy' && (
            <div className="settings-panel">
              <h3 className="panel-title">Pharmacy Information</h3>
              <p className="panel-description">
                Update your pharmacy's public information visible to customers.
              </p>

              <form className="settings-form" onSubmit={handleUpdatePharmacy}>
                <label>
                  <span className="label-text">Pharmacy Name</span>
                  <input
                    type="text"
                    value={pharmacySettings.name}
                    onChange={(e) =>
                      setPharmacySettings({
                        ...pharmacySettings,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  <span className="label-text">Address</span>
                  <textarea
                    value={pharmacySettings.address}
                    onChange={(e) =>
                      setPharmacySettings({
                        ...pharmacySettings,
                        address: e.target.value,
                      })
                    }
                    rows="3"
                    required
                  />
                </label>

                <div className="form-row">
                  <label>
                    <span className="label-text">Phone Number</span>
                    <input
                      type="tel"
                      value={pharmacySettings.phone}
                      onChange={(e) =>
                        setPharmacySettings({
                          ...pharmacySettings,
                          phone: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    <span className="label-text">Email Address</span>
                    <input
                      type="email"
                      value={pharmacySettings.email}
                      onChange={(e) =>
                        setPharmacySettings({
                          ...pharmacySettings,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                </div>

                <label>
                  <span className="label-text">Operating Hours</span>
                  <input
                    type="text"
                    value={pharmacySettings.operating_hours}
                    onChange={(e) =>
                      setPharmacySettings({
                        ...pharmacySettings,
                        operating_hours: e.target.value,
                      })
                    }
                    placeholder="e.g., Mon-Fri: 8AM-8PM, Sat-Sun: 9AM-6PM"
                  />
                </label>

                <label>
                  <span className="label-text">Description</span>
                  <textarea
                    value={pharmacySettings.description}
                    onChange={(e) =>
                      setPharmacySettings({
                        ...pharmacySettings,
                        description: e.target.value,
                      })
                    }
                    rows="4"
                    placeholder="Brief description of your pharmacy and services..."
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingPharmacy}
                  >
                    {isUpdatingPharmacy ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <h3 className="panel-title">Notification Preferences</h3>
              <p className="panel-description">
                Choose how you want to receive notifications about pharmacy activities.
              </p>

              <form className="settings-form" onSubmit={handleUpdateNotifications}>
                <div className="notification-section">
                  <h4 className="subsection-title">Email Notifications</h4>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.email_new_reservations}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email_new_reservations: e.target.checked,
                          })
                        }
                      />
                      <span>New reservations</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.email_new_prescriptions}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email_new_prescriptions: e.target.checked,
                          })
                        }
                      />
                      <span>New prescriptions submitted</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.email_low_stock}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email_low_stock: e.target.checked,
                          })
                        }
                      />
                      <span>Low stock alerts</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.email_medicine_requests}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email_medicine_requests: e.target.checked,
                          })
                        }
                      />
                      <span>Medicine requests from customers</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.email_reports}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email_reports: e.target.checked,
                          })
                        }
                      />
                      <span>Customer reports and complaints</span>
                    </label>
                  </div>
                </div>

                <div className="notification-section">
                  <h4 className="subsection-title">SMS Notifications</h4>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.sms_new_reservations}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            sms_new_reservations: e.target.checked,
                          })
                        }
                      />
                      <span>New reservations</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.sms_low_stock}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            sms_low_stock: e.target.checked,
                          })
                        }
                      />
                      <span>Critical low stock alerts</span>
                    </label>
                  </div>
                </div>

                <div className="notification-section">
                  <h4 className="subsection-title">Push Notifications</h4>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.push_new_reservations}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            push_new_reservations: e.target.checked,
                          })
                        }
                      />
                      <span>New reservations</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.push_new_prescriptions}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            push_new_prescriptions: e.target.checked,
                          })
                        }
                      />
                      <span>New prescriptions</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.push_low_stock}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            push_low_stock: e.target.checked,
                          })
                        }
                      />
                      <span>Low stock alerts</span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingNotifications}
                  >
                    {isUpdatingNotifications ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="settings-panel">
              <h3 className="panel-title">Alert Thresholds</h3>
              <p className="panel-description">
                Configure when you want to receive alerts for inventory and medicine expiry.
              </p>

              <form className="settings-form" onSubmit={handleUpdateAlerts}>
                <label>
                  <span className="label-text">Low Stock Threshold</span>
                  <input
                    type="number"
                    min="1"
                    value={alertSettings.low_stock_threshold}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        low_stock_threshold: parseInt(e.target.value, 10),
                      })
                    }
                    required
                  />
                  <small className="input-hint">
                    Alert when stock quantity falls below this number
                  </small>
                </label>

                <label>
                  <span className="label-text">Critical Stock Threshold</span>
                  <input
                    type="number"
                    min="1"
                    value={alertSettings.critical_stock_threshold}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        critical_stock_threshold: parseInt(e.target.value, 10),
                      })
                    }
                    required
                  />
                  <small className="input-hint">
                    Send urgent alert when stock reaches this critical level
                  </small>
                </label>

                <label>
                  <span className="label-text">Expiry Alert Window (Days)</span>
                  <input
                    type="number"
                    min="1"
                    value={alertSettings.expiry_alert_days}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        expiry_alert_days: parseInt(e.target.value, 10),
                      })
                    }
                    required
                  />
                  <small className="input-hint">
                    Alert when medicines are expiring within this many days
                  </small>
                </label>

                <div className="alert-preview">
                  <h4 className="subsection-title">Preview</h4>
                  <div className="alert-examples">
                    <div className="alert-example warning">
                      <strong>⚠️ Low Stock Alert</strong>
                      <p>
                        Paracetamol 500mg has {alertSettings.low_stock_threshold} or
                        fewer units remaining
                      </p>
                    </div>
                    <div className="alert-example critical">
                      <strong>🚨 Critical Stock Alert</strong>
                      <p>
                        Amoxicillin 500mg has reached critical level (
                        {alertSettings.critical_stock_threshold} units)
                      </p>
                    </div>
                    <div className="alert-example expiry">
                      <strong>📅 Expiry Alert</strong>
                      <p>
                        Ibuprofen 400mg expires in {alertSettings.expiry_alert_days} days
                        or less
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingAlerts}
                  >
                    {isUpdatingAlerts ? 'Saving…' : 'Save Thresholds'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-panel">
              <h3 className="panel-title">Change Password</h3>
              <p className="panel-description">
                Update your password to keep your account secure.
              </p>

              <form className="settings-form" onSubmit={handleChangePassword}>
                <label>
                  <span className="label-text">Current Password</span>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        current_password: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  <span className="label-text">New Password</span>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        new_password: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                  />
                  <small className="input-hint">
                    Must be at least 8 characters long
                  </small>
                </label>

                <label>
                  <span className="label-text">Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirm_password: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </form>

              <div className="settings-section-divider" />

              <h3 className="panel-title">Security Recommendations</h3>
              <div className="security-tips">
                <div className="security-tip">
                  <svg className="tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Use a strong, unique password</span>
                </div>
                <div className="security-tip">
                  <svg className="tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Change your password regularly</span>
                </div>
                <div className="security-tip">
                  <svg className="tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Never share your password with others</span>
                </div>
                <div className="security-tip">
                  <svg className="tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Log out from shared devices</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default SettingsPage
