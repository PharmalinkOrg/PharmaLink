// File: superadmin-web/src/hooks/useIdleLogout.js

import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
]

export const IDLE_WARNING_SECONDS = 60

/**
 * Signs the Super Admin out after a period of inactivity.
 *
 * timeoutMinutes = 0 disables the timer.
 * When warnBeforeLogout is true, `secondsLeft` counts down for
 * the final minute so a warning can be shown. During the warning
 * only an explicit `stayActive()` keeps the session alive.
 */
export function useIdleLogout({ timeoutMinutes, warnBeforeLogout, onTimeout }) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  const lastActivityRef = useRef(Date.now())
  const warningRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  })

  const stayActive = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningRef.current = false
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    if (!timeoutMinutes) {
      warningRef.current = false
      setSecondsLeft(null)
      return undefined
    }

    const timeoutMs = timeoutMinutes * 60 * 1000

    lastActivityRef.current = Date.now()
    warningRef.current = false

    const markActivity = () => {
      if (!warningRef.current) {
        lastActivityRef.current = Date.now()
      }
    }

    const interval = setInterval(() => {
      const remainingMs = timeoutMs - (Date.now() - lastActivityRef.current)

      if (remainingMs <= 0) {
        clearInterval(interval)
        warningRef.current = false
        setSecondsLeft(null)
        onTimeoutRef.current?.()
        return
      }

      if (warnBeforeLogout && remainingMs <= IDLE_WARNING_SECONDS * 1000) {
        warningRef.current = true
        setSecondsLeft(Math.ceil(remainingMs / 1000))
      }
    }, 1000)

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, markActivity, { passive: true })
    )

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, markActivity)
      )
    }
  }, [timeoutMinutes, warnBeforeLogout])

  return { secondsLeft, stayActive }
}
