// File: superadmin-web/src/components/dashboard/ActivityFeed.jsx

import { ChevronDown } from 'lucide-react'
import { useActivityLogs } from '../../hooks/useActivityLogs'
import styles from './Dashboard.module.css'

function formatTimeAgo(timestamp) {
  const now = new Date()
  const eventTime = new Date(timestamp)

  const diffMs = now - eventTime
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return eventTime.toLocaleDateString()
}

function getActionBadgeClass(action) {
  const actionLower = (action || '').toLowerCase()
  
  if (actionLower.includes('create') || actionLower.includes('add')) return 'approved'
  if (actionLower.includes('delete') || actionLower.includes('remove')) return 'rejected'
  if (actionLower.includes('update') || actionLower.includes('edit')) return 'pending'
  
  return 'pending'
}

function formatActionName(action) {
  if (!action) return 'Unknown Action'
  
  // Convert snake_case or camelCase to Title Case
  return action
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function ActivityFeed() {
  const {
    activities,
    pagination,
    loading,
    error,
    loadMore
  } = useActivityLogs(10)

  return (
    <div className={styles.activityContainer}>
      <div className={styles.activityHeader}>
        <h3 className={styles.activityTitle}>
          Activity Feed
        </h3>

        <button
          className={styles.moreBtn}
          aria-label="More options"
        >
          ⋮
        </button>
      </div>

      {error && (
        <div className={styles.activityErrorContainer}>
          <p className={styles.activityErrorText}>
            Failed to load activities: {error}
          </p>
        </div>
      )}

      <div className={styles.activityFeed}>
        {loading && activities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No activities yet</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={styles.activityItem}
            >
              <div className={styles.indicator} />

              <div className={styles.activityContent}>
                <div className={styles.topRow}>
                  <span className={styles.pharmacy}>
                    {activity.pharmacy?.name || activity.user?.name || 'System'}
                  </span>

                  <span className={styles.time}>
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>

                <p className={styles.description}>
                  {activity.user && (
                    <span className={styles.userName}>
                      {activity.user.name}
                    </span>
                  )}
                  {' '}
                  <span
                    className={`${styles.activityBadge} ${
                      styles[getActionBadgeClass(activity.action)]
                    }`}
                  >
                    {formatActionName(activity.action)}
                  </span>
                </p>

                {activity.description && (
                  <p className={styles.reason}>
                    {activity.description}
                  </p>
                )}

                {activity.entityType && (
                  <p className={styles.entityInfo}>
                    {activity.entityType}
                    {activity.entityId && ` #${activity.entityId}`}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.hasMore && !loading && (
        <button
          className={styles.loadMoreBtn}
          onClick={loadMore}
          disabled={loading}
        >
          <span>Load More</span>
          <ChevronDown size={16} />
        </button>
      )}

      {!pagination.hasMore && activities.length > 0 && (
        <p className={styles.endText}>
          No more activities
        </p>
      )}
    </div>
  )
}