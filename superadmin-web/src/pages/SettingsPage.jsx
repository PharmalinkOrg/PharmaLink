// File: superadmin-web/src/pages/SettingsPage.jsx

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Upload,
  X,
} from 'lucide-react'

import { logoutSuperAdmin } from '../services/authService'
import { getPharmacies } from '../services/pharmacyService'
import {
  DATE_FORMAT_OPTIONS,
  DIGEST_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PHARMACY_SORT_OPTIONS,
  SESSION_TIMEOUT_OPTIONS,
  TIMEZONE_OPTIONS,
  changeSuperAdminPassword,
  downloadCsv,
  downloadJson,
  formatDisplayDate,
  getLastSavedAt,
  loadSettings,
  parseImportedSettings,
  resetSettings,
  saveSettings,
} from '../services/settingsService'
import { CEBU_BOUNDS } from '../utils/cebuLocation'

import './SettingsPage.css'

/* ============================================================
   CONSTANTS
============================================================ */

const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    icon: SlidersHorizontal,
    description: 'System identity, support contacts and regional formats.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Choose which platform events send email alerts, and to whom.',
  },
  {
    id: 'pharmacies',
    label: 'Pharmacy Management',
    icon: Store,
    description: 'Defaults for the Pharmacies page and partner registration.',
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldCheck,
    description: 'Session timeout, password and sign-in for this account.',
  },
  {
    id: 'data',
    label: 'Data & Backup',
    icon: Database,
    description: 'Export platform data and back up or restore these settings.',
  },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/

/* ============================================================
   VALIDATION
============================================================ */

function parseRecipients(text) {
  return String(text || '')
    .split(/[,;\n]/)
    .map((email) => email.trim())
    .filter(Boolean)
}

function validateSettings(draft) {
  const errors = {}
  const { general, notifications } = draft

  if (!general.systemName.trim()) {
    errors['general.systemName'] = 'System name is required.'
  }

  if (general.supportEmail.trim() && !EMAIL_PATTERN.test(general.supportEmail.trim())) {
    errors['general.supportEmail'] = 'Enter a valid email address.'
  }

  if (general.supportPhone.trim() && !PHONE_PATTERN.test(general.supportPhone.trim())) {
    errors['general.supportPhone'] = 'Enter a valid phone number.'
  }

  if (notifications.emailEnabled) {
    const recipients = parseRecipients(notifications.recipients)
    const invalid = recipients.filter((email) => !EMAIL_PATTERN.test(email))

    if (invalid.length > 0) {
      errors['notifications.recipients'] = `Invalid address: ${invalid.join(', ')}`
    }
  }

  return errors
}

function getPasswordChecks(password) {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    {
      id: 'case',
      label: 'Upper and lowercase letters',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { id: 'number', label: 'At least one number', met: /\d/.test(password) },
    { id: 'symbol', label: 'At least one symbol', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function Card({ title, description, children, tone }) {
  return (
    <section className={`settings-card ${tone ? `settings-card-${tone}` : ''}`}>
      {(title || description) && (
        <header className="settings-card-header">
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </header>
      )}

      <div className="settings-card-body">{children}</div>
    </section>
  )
}

function Field({ id, label, hint, error, required, children }) {
  return (
    <div className={`settings-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="settings-required">*</span>}
      </label>

      {children}

      {error ? (
        <small className="settings-field-error">{error}</small>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </div>
  )
}

function Toggle({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className={`settings-toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <div className="settings-toggle-text">
        <label htmlFor={id}>{label}</label>
        {description && <p>{description}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`settings-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="settings-switch-thumb" />
      </button>
    </div>
  )
}

function Select({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="settings-input"
      value={value}
      onChange={(event) => {
        const option = options.find((item) => String(item.value) === event.target.value)
        onChange(option ? option.value : event.target.value)
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/* ============================================================
   PASSWORD CARD
============================================================ */

function PasswordCard() {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const checks = getPasswordChecks(values.next)
  const strength =
    checks.filter((check) => check.met).length + (values.next.length >= 12 ? 1 : 0)

  const update = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!values.current) {
      setError('Enter your current password.')
      return
    }

    if (checks.some((check) => !check.met)) {
      setError('The new password does not meet all requirements.')
      return
    }

    if (values.next === values.current) {
      setError('The new password must be different from the current one.')
      return
    }

    if (values.next !== values.confirm) {
      setError('The new passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      await changeSuperAdminPassword({
        currentPassword: values.current,
        newPassword: values.next,
      })
      setValues({ current: '', next: '', confirm: '' })
      setSuccess('Your password was changed.')
    } catch (submitError) {
      setError(submitError.message || 'Unable to change the password.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputType = show ? 'text' : 'password'

  return (
    <Card
      title="Change Password"
      description="Use a long, unique password. You will stay signed in on this browser."
    >
      <form className="settings-password-form" onSubmit={handleSubmit} noValidate>
        <Field id="current-password" label="Current password" required>
          <input
            id="current-password"
            className="settings-input"
            type={inputType}
            value={values.current}
            onChange={update('current')}
            autoComplete="current-password"
          />
        </Field>

        <div className="settings-grid">
          <Field id="new-password" label="New password" required>
            <input
              id="new-password"
              className="settings-input"
              type={inputType}
              value={values.next}
              onChange={update('next')}
              autoComplete="new-password"
            />
          </Field>

          <Field id="confirm-password" label="Confirm new password" required>
            <input
              id="confirm-password"
              className="settings-input"
              type={inputType}
              value={values.confirm}
              onChange={update('confirm')}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {values.next && (
          <div className="password-strength" data-strength={strength}>
            <div className="password-strength-bar">
              {[1, 2, 3, 4, 5].map((level) => (
                <span key={level} className={strength >= level ? 'is-filled' : ''} />
              ))}
            </div>
            <small>{STRENGTH_LABELS[strength]}</small>
          </div>
        )}

        <ul className="password-checklist">
          {checks.map((check) => (
            <li key={check.id} className={check.met ? 'is-met' : ''}>
              {check.met ? <Check size={13} /> : <X size={13} />}
              {check.label}
            </li>
          ))}
        </ul>

        {error && (
          <div className="settings-inline-alert is-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="settings-inline-alert is-success" role="status">
            <CheckCircle2 size={15} />
            <span>{success}</span>
          </div>
        )}

        <div className="settings-actions-row">
          <button
            type="button"
            className="settings-button secondary"
            onClick={() => setShow((current) => !current)}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
            {show ? 'Hide passwords' : 'Show passwords'}
          </button>

          <button type="submit" className="settings-button primary" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="settings-spin" /> : <KeyRound size={15} />}
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ============================================================
   SETTINGS PAGE
============================================================ */

export function SettingsPage() {
  const navigate = useNavigate()
  const importInputRef = useRef(null)

  const [savedSettings, setSavedSettings] = useState(() => loadSettings())
  const [draft, setDraft] = useState(() => loadSettings())
  const [activeSection, setActiveSection] = useState('general')
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(() => getLastSavedAt())

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings]
  )

  const section = SECTIONS.find((item) => item.id === activeSection)

  /* Warn before leaving the browser tab with unsaved changes. */
  useEffect(() => {
    if (!isDirty) {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  /* ==========================================================
     DRAFT HELPERS
  ========================================================== */

  const updateField = (sectionId, key, value) => {
    setDraft((current) => ({
      ...current,
      [sectionId]: { ...current[sectionId], [key]: value },
    }))

    const errorKey = `${sectionId}.${key}`

    if (errors[errorKey]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[errorKey]
        return next
      })
    }
  }

  const bind = (sectionId, key) => ({
    value: draft[sectionId][key],
    onChange: (event) => updateField(sectionId, key, event.target.value),
  })

  const errorFor = (sectionId, key) => errors[`${sectionId}.${key}`]

  /* ==========================================================
     SAVE / DISCARD / RESET
  ========================================================== */

  const handleSave = () => {
    const validationErrors = validateSettings(draft)
    setErrors(validationErrors)

    const firstError = Object.keys(validationErrors)[0]

    if (firstError) {
      setActiveSection(firstError.split('.')[0])
      setNotice({ type: 'error', text: 'Fix the highlighted fields before saving.' })
      return
    }

    try {
      setSaving(true)

      const clean = saveSettings({
        ...draft,
        general: {
          ...draft.general,
          systemName: draft.general.systemName.trim(),
          supportEmail: draft.general.supportEmail.trim(),
          supportPhone: draft.general.supportPhone.trim(),
        },
        notifications: {
          ...draft.notifications,
          recipients: parseRecipients(draft.notifications.recipients).join(', '),
        },
      })

      setSavedSettings(clean)
      setDraft(clean)
      setLastSavedAt(getLastSavedAt())
      setNotice({ type: 'success', text: 'Settings saved.' })
    } catch (saveError) {
      setNotice({ type: 'error', text: saveError.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setDraft(savedSettings)
    setErrors({})
  }

  const handleReset = () => {
    if (
      !window.confirm(
        'Reset all settings to their defaults? This cannot be undone.'
      )
    ) {
      return
    }

    const defaults = resetSettings()
    setSavedSettings(defaults)
    setDraft(defaults)
    setErrors({})
    setLastSavedAt(null)
    setNotice({ type: 'success', text: 'All settings were reset to defaults.' })
  }

  /* ==========================================================
     DATA EXPORT / IMPORT
  ========================================================== */

  const today = new Date().toISOString().slice(0, 10)

  const handleExportPharmacies = async () => {
    try {
      setExporting(true)

      const pharmacies = await getPharmacies()
      const rows = Array.isArray(pharmacies) ? pharmacies : []

      downloadCsv(`pharmalink-pharmacies-${today}.csv`, [
        [
          'Pharmacy ID',
          'Name',
          'Email',
          'Contact Number',
          'Address',
          'Latitude',
          'Longitude',
          'Status',
          'Registered',
        ],
        ...rows.map((pharmacy) => [
          pharmacy.pharmacy_id ?? pharmacy.id,
          pharmacy.name,
          pharmacy.email,
          pharmacy.contact_number,
          pharmacy.address,
          pharmacy.latitude,
          pharmacy.longitude,
          pharmacy.status,
          formatDisplayDate(pharmacy.created_at, { ...savedSettings.general, dateFormat: 'iso' }),
        ]),
      ])

      setNotice({
        type: 'success',
        text: `Exported ${rows.length} ${rows.length === 1 ? 'pharmacy' : 'pharmacies'}.`,
      })
    } catch (exportError) {
      setNotice({
        type: 'error',
        text: exportError.message || 'Unable to export pharmacies.',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportSettings = () => {
    downloadJson(`pharmalink-settings-${today}.json`, {
      app: 'PharmaLink Super Admin',
      exportedAt: new Date().toISOString(),
      settings: savedSettings,
    })
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (file.size > 100 * 1024) {
      setNotice({ type: 'error', text: 'That file is too large to be a settings backup.' })
      return
    }

    try {
      const imported = parseImportedSettings(await file.text())
      setDraft(imported)
      setErrors({})
      setNotice({
        type: 'success',
        text: 'Settings imported. Review them, then click Save changes.',
      })
    } catch (importError) {
      setNotice({ type: 'error', text: importError.message })
    }
  }

  const handleLogout = () => {
    logoutSuperAdmin()
    navigate('/login', { replace: true })
  }

  const hasSessionToken = Boolean(sessionStorage.getItem('pharmalink_access_token'))

  /* ==========================================================
     SECTION CONTENT
  ========================================================== */

  const renderGeneral = () => (
    <>
      <Card title="System Identity">
        <Field
          id="system-name"
          label="System name"
          required
          error={errorFor('general', 'systemName')}
          hint="Shown in the browser tab of the Super Admin portal."
        >
          <input id="system-name" className="settings-input" maxLength={60} {...bind('general', 'systemName')} />
        </Field>

        <div className="settings-grid">
          <Field
            id="support-email"
            label="Support email"
            error={errorFor('general', 'supportEmail')}
            hint="Where pharmacies and customers can reach the platform team."
          >
            <input
              id="support-email"
              type="email"
              className="settings-input"
              placeholder="support@pharmalink.com"
              {...bind('general', 'supportEmail')}
            />
          </Field>

          <Field id="support-phone" label="Support phone" error={errorFor('general', 'supportPhone')}>
            <input
              id="support-phone"
              type="tel"
              className="settings-input"
              placeholder="(032) 123 4567"
              {...bind('general', 'supportPhone')}
            />
          </Field>
        </div>
      </Card>

      <Card title="Regional Format" description="Applies to dates across the Super Admin portal.">
        <div className="settings-grid">
          <Field id="timezone" label="Time zone">
            <Select
              id="timezone"
              value={draft.general.timezone}
              onChange={(value) => updateField('general', 'timezone', value)}
              options={TIMEZONE_OPTIONS}
            />
          </Field>

          <Field
            id="date-format"
            label="Date format"
            hint={`Preview: ${formatDisplayDate(new Date(), draft.general)}`}
          >
            <Select
              id="date-format"
              value={draft.general.dateFormat}
              onChange={(value) => updateField('general', 'dateFormat', value)}
              options={DATE_FORMAT_OPTIONS}
            />
          </Field>
        </div>
      </Card>
    </>
  )

  const renderNotifications = () => {
    const disabled = !draft.notifications.emailEnabled
    const toggle = (key) => (value) => updateField('notifications', key, value)

    return (
      <>
        <Card>
          <Toggle
            id="email-enabled"
            label="Email notifications"
            description="Send platform alerts to the Super Admin team by email."
            checked={draft.notifications.emailEnabled}
            onChange={toggle('emailEnabled')}
          />

          <Field
            id="recipients"
            label="Recipients"
            error={errorFor('notifications', 'recipients')}
            hint="Separate multiple addresses with commas. Leave empty to use the Super Admin account email."
          >
            <textarea
              id="recipients"
              className="settings-input settings-textarea"
              rows={2}
              placeholder="admin@pharmalink.com, ops@pharmalink.com"
              disabled={disabled}
              {...bind('notifications', 'recipients')}
            />
          </Field>

          <Field id="digest" label="Delivery">
            <select
              id="digest"
              className="settings-input"
              value={draft.notifications.digestFrequency}
              onChange={(event) => updateField('notifications', 'digestFrequency', event.target.value)}
              disabled={disabled}
            >
              {DIGEST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        <Card title="Events" description="Choose which events trigger a notification.">
          <Toggle
            id="notify-new-pharmacy"
            label="New partner pharmacy registered"
            checked={draft.notifications.newPharmacy}
            onChange={toggle('newPharmacy')}
            disabled={disabled}
          />
          <Toggle
            id="notify-pharmacy-updated"
            label="Pharmacy details or status changed"
            checked={draft.notifications.pharmacyUpdated}
            onChange={toggle('pharmacyUpdated')}
            disabled={disabled}
          />
          <Toggle
            id="notify-new-admin"
            label="New Pharmacy Admin account created"
            checked={draft.notifications.newPharmacyAdmin}
            onChange={toggle('newPharmacyAdmin')}
            disabled={disabled}
          />
          <Toggle
            id="notify-new-user"
            label="New customer sign-up"
            description="Can be frequent on a busy day — a daily summary is recommended."
            checked={draft.notifications.newUserSignup}
            onChange={toggle('newUserSignup')}
            disabled={disabled}
          />
          <Toggle
            id="notify-failed-logins"
            label="Repeated failed sign-in attempts"
            description="Security alert when an account has several failed attempts in a row."
            checked={draft.notifications.failedLogins}
            onChange={toggle('failedLogins')}
            disabled={disabled}
          />
        </Card>
      </>
    )
  }

  const renderPharmacies = () => (
    <>
      <Card title="Pharmacies Page">
        <div className="settings-grid">
          <Field id="page-size" label="Pharmacies per page">
            <Select
              id="page-size"
              value={draft.pharmacies.pageSize}
              onChange={(value) => updateField('pharmacies', 'pageSize', value)}
              options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} per page` }))}
            />
          </Field>

          <Field id="default-sort" label="Default sort order">
            <Select
              id="default-sort"
              value={draft.pharmacies.defaultSort}
              onChange={(value) => updateField('pharmacies', 'defaultSort', value)}
              options={PHARMACY_SORT_OPTIONS}
            />
          </Field>
        </div>
      </Card>

      <Card title="Partner Registration">
        <Toggle
          id="require-contact"
          label="Require contact information"
          description="New and edited pharmacies must have an email address or a contact number."
          checked={draft.pharmacies.requireContactInfo}
          onChange={(value) => updateField('pharmacies', 'requireContactInfo', value)}
        />

        <div className="settings-info-row">
          <MapPin size={16} />
          <div>
            <strong>Service area: Cebu province</strong>
            <p>
              Location search and map pins are limited to Cebu (lat {CEBU_BOUNDS.south}–
              {CEBU_BOUNDS.north}, lng {CEBU_BOUNDS.west}–{CEBU_BOUNDS.east}), including Mactan,
              Bantayan and Camotes.
            </p>
          </div>
        </div>
      </Card>
    </>
  )

  const renderSecurity = () => (
    <>
      <Card title="Session" description="Automatically sign out of this browser after inactivity.">
        <Field id="session-timeout" label="Sign out after">
          <Select
            id="session-timeout"
            value={draft.security.sessionTimeoutMinutes}
            onChange={(value) => updateField('security', 'sessionTimeoutMinutes', value)}
            options={SESSION_TIMEOUT_OPTIONS}
          />
        </Field>

        <Toggle
          id="warn-before-logout"
          label="Warn before signing out"
          description="Show a 60-second countdown with an option to stay signed in."
          checked={draft.security.warnBeforeLogout}
          onChange={(value) => updateField('security', 'warnBeforeLogout', value)}
          disabled={draft.security.sessionTimeoutMinutes === 0}
        />

        <div className="settings-info-row">
          <Clock size={16} />
          <div>
            <strong>{hasSessionToken ? 'Signed in on this browser' : 'No active session token'}</strong>
            <p>Your session ends when this browser tab is closed.</p>
          </div>

          <button type="button" className="settings-button secondary" onClick={handleLogout}>
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </Card>

      <PasswordCard />
    </>
  )

  const renderData = () => (
    <>
      <Card title="Export Data">
        <div className="settings-action-item">
          <div>
            <strong>Partner pharmacies</strong>
            <p>All pharmacies with contact details, address, coordinates and status as a CSV file.</p>
          </div>

          <button
            type="button"
            className="settings-button secondary"
            onClick={handleExportPharmacies}
            disabled={exporting}
          >
            {exporting ? <Loader2 size={15} className="settings-spin" /> : <Download size={15} />}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </Card>

      <Card title="Settings Backup">
        <div className="settings-action-item">
          <div>
            <strong>Export settings</strong>
            <p>Download the saved settings as a JSON file.</p>
          </div>

          <button type="button" className="settings-button secondary" onClick={handleExportSettings}>
            <Download size={15} />
            Export
          </button>
        </div>

        <div className="settings-action-item">
          <div>
            <strong>Import settings</strong>
            <p>Load a settings backup. You can review the values before saving.</p>
          </div>

          <button
            type="button"
            className="settings-button secondary"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={15} />
            Import
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportFile}
          />
        </div>

        <p className="settings-meta">
          {lastSavedAt
            ? `Last saved ${new Date(lastSavedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: savedSettings.general.timezone,
              })}`
            : 'Using default settings.'}
        </p>
      </Card>

      <Card title="Danger Zone" tone="danger">
        <div className="settings-action-item">
          <div>
            <strong>Reset all settings</strong>
            <p>Restore every setting on this page to its default value.</p>
          </div>

          <button type="button" className="settings-button danger" onClick={handleReset}>
            <RotateCcw size={15} />
            Reset to defaults
          </button>
        </div>
      </Card>
    </>
  )

  const renderSection = {
    general: renderGeneral,
    notifications: renderNotifications,
    pharmacies: renderPharmacies,
    security: renderSecurity,
    data: renderData,
  }[activeSection]

  const sectionHasError = (sectionId) =>
    Object.keys(errors).some((key) => key.startsWith(`${sectionId}.`))

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <div className="page-header-sticky">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <h1>Settings</h1>
            </div>

            <p>Manage system settings and Super Admin account preferences.</p>
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="settings-page">
          {notice && (
            <div className={`settings-notice is-${notice.type}`} role="status">
              {notice.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="settings-layout">
            <nav className="settings-nav" aria-label="Settings sections">
              {SECTIONS.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {sectionHasError(item.id) && <span className="settings-nav-dot" />}
                  </button>
                )
              })}
            </nav>

            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </div>

              {renderSection()}
            </div>
          </div>

          {isDirty && (
            <div className="settings-save-bar" role="region" aria-label="Unsaved changes">
              <span>You have unsaved changes.</span>

              <div>
                <button type="button" className="settings-button secondary" onClick={handleDiscard} disabled={saving}>
                  Discard
                </button>

                <button type="button" className="settings-button primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={15} className="settings-spin" /> : <Save size={15} />}
                  Save changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
