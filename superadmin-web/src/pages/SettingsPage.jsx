// File: superadmin-web/src/pages/SettingsPage.jsx

import { useState } from 'react'
import { Settings, Lock } from 'lucide-react'
import './SettingsPage.css'

export function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title-row">
          <Settings size={24} />
          <h1>Settings</h1>
        </div>

        <p>
          Manage general system settings and Super Admin account preferences.
        </p>
      </div>

      <div className="settings-section">
        <h3>General Settings</h3>

        <p>
          Configure basic system preferences for PharmaLink.
        </p>

        <div className="settings-info">
          <strong>System Name:</strong> PharmaLink
        </div>

        <div style={{ marginTop: '16px' }}>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(event) =>
                setEmailNotifications(event.target.checked)
              }
            />

            <span>Enable email notifications</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Password Reset</h3>

        <p>
          Reset the Super Admin account password when necessary.
        </p>

        <button
          type="button"
          className="password-reset-button"
          onClick={() =>
            alert('Password reset feature is not available yet.')
          }
        >
          <Lock size={16} />
          Reset Password
        </button>
      </div>
    </div>
  )
}