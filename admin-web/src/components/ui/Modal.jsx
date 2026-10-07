// File: admin-web/src/components/ui/Modal.jsx
//
// Shared modal dialog. Uses the med-modal* styles from
// pages/MedicinesPage.css (import that CSS on pages that use it).
//
// - Rendered in a portal on <body>
// - Esc closes, click outside closes, Tab stays inside
// - Supports stacking (e.g. a confirm dialog on top of a
//   details modal): only the top-most modal reacts to keys
//
// <Modal
//   open={isOpen}
//   onClose={close}
//   title="Reservation #18"
//   description="Submitted Oct 7, 2026"
//   footer={<button ...>Close</button>}
// >
//   ...body...
// </Modal>

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

// Open modals, oldest first. Only the last one handles keys.
const modalStack = []

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function Modal({
  open,
  onClose,
  title,
  titleAddon = null,
  description,
  children,
  footer = null,
  className = '',
  bodyClassName = '',
  closeDisabled = false,
  initialFocusRef = null,
}) {
  const autoId = useId()
  const titleId = `modal-title-${autoId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const panelRef = useRef(null)
  const stackId = useRef(Symbol('modal'))

  // Latest values for the key listener
  const onCloseRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)
  onCloseRef.current = onClose
  closeDisabledRef.current = closeDisabled

  useEffect(() => {
    if (!open) return undefined

    const id = stackId.current
    modalStack.push(id)

    const previouslyFocused = document.activeElement

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ||
        panelRef.current?.querySelector(FOCUSABLE)

      target?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (modalStack[modalStack.length - 1] !== id) return
      if (event.defaultPrevented) return

      if (event.key === 'Escape') {
        if (!closeDisabledRef.current) onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll(FOCUSABLE)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)

      const index = modalStack.lastIndexOf(id)
      if (index >= 0) modalStack.splice(index, 1)

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
    // initialFocusRef is a ref object; reading .current is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="med-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !closeDisabled
        ) {
          onClose?.()
        }
      }}
    >
      <div
        ref={panelRef}
        className={`med-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="med-modal-header">
          <div>
            <div className="ui-modal-title-row">
              <h3 id={titleId}>{title}</h3>
              {titleAddon}
            </div>

            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className="med-icon-btn"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className={bodyClassName || 'ui-modal-body'}>
          {children}
        </div>

        {footer && (
          <footer className="med-modal-footer">{footer}</footer>
        )}
      </div>
    </div>,
    document.body
  )
}