// File: superadmin-web/src/services/settingsService.js

/* ============================================================
   SUPER ADMIN SETTINGS

   Settings are stored in this browser (localStorage) so they
   work today without a backend table. To sync them across
   devices later, replace loadSettings / saveSettings with API
   calls — the rest of the app only uses these functions.
============================================================ */

import { apiRequest } from './apiClient'

const STORAGE_KEY = 'pharmalink_superadmin_settings'
const SAVED_AT_KEY = 'pharmalink_superadmin_settings_saved_at'

export const SETTINGS_UPDATED_EVENT = 'pharmalink:settings-updated'

/* ============================================================
   OPTIONS
============================================================ */

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export const PHARMACY_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Name A–Z' },
  { value: 'za', label: 'Name Z–A' },
]

export const DATE_FORMAT_OPTIONS = [
  { value: 'medium', label: 'Short month (Oct 8, 2026)' },
  { value: 'long', label: 'Full month (October 8, 2026)' },
  { value: 'numeric-dmy', label: 'Day/Month/Year (08/10/2026)' },
  { value: 'numeric-mdy', label: 'Month/Day/Year (10/08/2026)' },
  { value: 'iso', label: 'ISO (2026-10-08)' },
]

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Manila', label: 'Philippines (Asia/Manila, UTC+8)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'UTC', label: 'UTC' },
]

export const SESSION_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
]

export const DIGEST_OPTIONS = [
  { value: 'instant', label: 'Instantly' },
  { value: 'daily', label: 'Daily summary' },
  { value: 'weekly', label: 'Weekly summary' },
]

/* ============================================================
   DEFAULTS
============================================================ */

export const DEFAULT_SETTINGS = {
  general: {
    systemName: 'PharmaLink',
    supportEmail: '',
    supportPhone: '',
    timezone: 'Asia/Manila',
    dateFormat: 'medium',
  },

  notifications: {
    emailEnabled: true,
    recipients: '',
    newPharmacy: true,
    pharmacyUpdated: false,
    newPharmacyAdmin: true,
    newUserSignup: false,
    failedLogins: true,
    digestFrequency: 'instant',
  },

  pharmacies: {
    pageSize: 10,
    defaultSort: 'newest',
    requireContactInfo: false,
  },

  security: {
    sessionTimeoutMinutes: 30,
    warnBeforeLogout: true,
  },
}

const ALLOWED_VALUES = {
  'general.timezone': TIMEZONE_OPTIONS.map((o) => o.value),
  'general.dateFormat': DATE_FORMAT_OPTIONS.map((o) => o.value),
  'notifications.digestFrequency': DIGEST_OPTIONS.map((o) => o.value),
  'pharmacies.pageSize': PAGE_SIZE_OPTIONS,
  'pharmacies.defaultSort': PHARMACY_SORT_OPTIONS.map((o) => o.value),
  'security.sessionTimeoutMinutes': SESSION_TIMEOUT_OPTIONS.map((o) => o.value),
}

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULT_SETTINGS))

/**
 * Keeps only known keys with the right type and allowed value,
 * filling anything missing or invalid from the defaults.
 */
export function sanitizeSettings(input) {
  const result = cloneDefaults()

  if (!input || typeof input !== 'object') {
    return result
  }

  Object.entries(DEFAULT_SETTINGS).forEach(([section, defaults]) => {
    const source =
      input[section] && typeof input[section] === 'object'
        ? input[section]
        : {}

    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const value = source[key]

      if (typeof value !== typeof defaultValue) {
        return
      }

      const allowed = ALLOWED_VALUES[`${section}.${key}`]

      if (allowed && !allowed.includes(value)) {
        return
      }

      result[section][key] = typeof value === 'string' ? value.slice(0, 500) : value
    })
  })

  return result
}

/* ============================================================
   LOAD / SAVE
============================================================ */

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return sanitizeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return cloneDefaults()
  }
}

function notifySettingsChanged(settings) {
  window.dispatchEvent(
    new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: settings })
  )
}

export function saveSettings(settings) {
  const clean = sanitizeSettings(settings)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
    localStorage.setItem(SAVED_AT_KEY, new Date().toISOString())
  } catch {
    throw new Error(
      'Settings could not be saved. Browser storage may be full or disabled.'
    )
  }

  notifySettingsChanged(clean)
  return clean
}

export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SAVED_AT_KEY)
  } catch {
    // Ignore — defaults are returned either way.
  }

  const defaults = cloneDefaults()
  notifySettingsChanged(defaults)
  return defaults
}

export function getLastSavedAt() {
  try {
    return localStorage.getItem(SAVED_AT_KEY)
  } catch {
    return null
  }
}

export function parseImportedSettings(text) {
  let parsed

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This file does not contain PharmaLink settings.')
  }

  const source = parsed.settings && typeof parsed.settings === 'object'
    ? parsed.settings
    : parsed

  const knownSections = Object.keys(DEFAULT_SETTINGS)

  if (!knownSections.some((section) => section in source)) {
    throw new Error('This file does not contain PharmaLink settings.')
  }

  return sanitizeSettings(source)
}

/* ============================================================
   DATE FORMATTING
============================================================ */

export function formatDisplayDate(value, general = DEFAULT_SETTINGS.general) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const timeZone = general?.timezone || 'Asia/Manila'

  try {
    switch (general?.dateFormat) {
      case 'long':
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone,
        })

      case 'numeric-dmy':
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone,
        })

      case 'numeric-mdy':
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          timeZone,
        })

      case 'iso':
        return date.toLocaleDateString('en-CA', { timeZone })

      default:
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone,
        })
    }
  } catch {
    return date.toLocaleDateString()
  }
}

/* ============================================================
   FILE DOWNLOADS
============================================================ */

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeCsvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)

  // Stop spreadsheet apps from treating cells as formulas.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')

  // BOM so Excel opens accented names (e.g. Osmeña) correctly.
  triggerDownload(
    filename,
    new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  )
}

export function downloadJson(filename, data) {
  triggerDownload(
    filename,
    new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
  )
}

/* ============================================================
   PASSWORD CHANGE
   POST /api/auth/change-password
============================================================ */

export async function changeSuperAdminPassword({ currentPassword, newPassword }) {
  await apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}
