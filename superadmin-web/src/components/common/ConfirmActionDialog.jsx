// File: superadmin-web/src/components/common/ConfirmActionDialog.jsx
//
// Confirmation dialog for account and status actions
// (approve, reject, activate, deactivate). Optionally asks for a
// reason, which is sent to the backend and stored in the audit log.

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'

import './ConfirmActionDialog.css'

const MAX_REASON_LENGTH = 500

export default function ConfirmActionDialog({
  open,
  title,
  message,
  details,
  tone = 'default',
  confirmLabel = 'Confirm',
  reasonMode = 'none',
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Explain why...',
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError('')
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, submitting, onClose])

  if (!open) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmed = reason.trim()

    if (reasonMode === 'required' && trimmed.length < 5) {
      setError('Please enter a reason (at least 5 characters).')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onConfirm(trimmed || null)
    } catch (actionError) {
      setError(actionError.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const Icon =
    tone === 'danger' ? AlertTriangle : tone === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose()
        }
      }}
    >
      <form
        className={`confirm-dialog tone-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="confirm-dialog-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="confirm-dialog-icon">
          <Icon size={22} />
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>

        {message && <p className="confirm-dialog-message">{message}</p>}

        {details && <div className="confirm-dialog-details">{details}</div>}

        {reasonMode !== 'none' && (
          <div className="confirm-dialog-field">
            <label htmlFor="confirm-dialog-reason">
              {reasonLabel}
              {reasonMode === 'required' ? (
                <span className="confirm-dialog-required">*</span>
              ) : (
                <span className="confirm-dialog-optional"> (optional)</span>
              )}
            </label>

            <textarea
              id="confirm-dialog-reason"
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setError('')
              }}
              placeholder={reasonPlaceholder}
              disabled={submitting}
              autoFocus
            />

            <small>
              {reason.length}/{MAX_REASON_LENGTH} · Saved in the audit log.
            </small>
          </div>
        )}

        {error && (
          <div className="confirm-dialog-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="confirm-dialog-confirm"
            disabled={submitting}
            autoFocus={reasonMode === 'none'}
          >
            {submitting && <Loader2 size={15} className="confirm-dialog-spin" />}
            {submitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
