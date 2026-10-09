// File: superadmin-web/src/components/layout/SessionTimeoutDialog.jsx

import { Clock } from 'lucide-react'
import './SessionTimeoutDialog.css'

export default function SessionTimeoutDialog({ secondsLeft, onStay, onLogout }) {
  return (
    <div className="session-timeout-backdrop">
      <div
        className="session-timeout-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-text"
      >
        <div className="session-timeout-icon">
          <Clock size={22} />
        </div>

        <h2 id="session-timeout-title">Are you still there?</h2>

        <p id="session-timeout-text">
          For security, you will be signed out in{' '}
          <strong>{secondsLeft}s</strong> due to inactivity.
        </p>

        <div className="session-timeout-actions">
          <button type="button" className="session-timeout-secondary" onClick={onLogout}>
            Log out now
          </button>

          <button
            type="button"
            className="session-timeout-primary"
            onClick={onStay}
            autoFocus
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
