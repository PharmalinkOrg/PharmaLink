// File: superadmin-web/src/utils/activityFormat.js
// Shared formatting for activity / audit log entries.
// Used by the dashboard Activity feed and the Audit Logs page.

/**
 * "Just now", "5 min ago", "3h ago", "2d ago", or a date.
 */
export function formatTimeAgo(timestamp) {
  const eventTime = new Date(timestamp)

  if (Number.isNaN(eventTime.getTime())) return '—'

  const diffMs = Date.now() - eventTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return eventTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * "Oct 7, 2026, 5:07 AM"
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * How long ago something started, in plain words:
 * "20 minutes", "5 hours", "3 days".
 */
export function formatDuration(since) {
  const start = new Date(since)

  if (Number.isNaN(start.getTime())) return ''

  const diffMins = Math.max(
    Math.floor((Date.now() - start.getTime()) / 60000),
    0
  )

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'}`
  }

  const hours = Math.floor(diffMins / 60)

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  const days = Math.floor(hours / 24)

  return `${days} day${days === 1 ? '' : 's'}`
}

/**
 * Turns "UPDATE_PHARMACY", "updatePharmacy" or "update pharmacy"
 * into "Update Pharmacy".
 */
export function formatActionName(action) {
  if (!action) return 'Unknown action'

  return String(action)
    .replace(/[_-]+/g, ' ')
    // split camelCase only (lowercase followed by uppercase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ')
}

/**
 * Colour family for an action:
 * positive (created/approved), negative (deleted/rejected),
 * info (updated), neutral (login/view/other).
 */
export function getActionTone(action) {
  const value = String(action || '').toLowerCase()

  if (
    /(create|add|approve|activate|verif|register|restore)/.test(
      value
    )
  ) {
    return 'positive'
  }

  if (
    /(delete|remove|reject|deactivate|suspend|cancel|archive|fail)/.test(
      value
    )
  ) {
    return 'negative'
  }

  if (/(update|edit|change|assign|reset)/.test(value)) {
    return 'info'
  }

  return 'neutral'
}

/**
 * Who did it: user name, then pharmacy name, then "System".
 */
export function getActorName(activity) {
  return (
    activity?.user?.name ||
    activity?.pharmacy?.name ||
    'System'
  )
}

/**
 * "Pharmacy #12", "User #4" or "" when no entity.
 */
export function formatEntity(activity) {
  if (!activity?.entityType) return ''

  const type = formatActionName(activity.entityType)

  return activity.entityId
    ? `${type} #${activity.entityId}`
    : type
}