// File: superadmin-web/src/components/dashboard/ActivityFeed.jsx
// Tier 5: latest audit log entries. Same data source as the
// Audit Logs page (GET /superadmin/activity-logs).

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { useActivityLogs } from '../../hooks/useActivityLogs'
import {
  formatActionName,
  formatDateTime,
  formatEntity,
  formatTimeAgo,
  getActionTone,
  getActorName,
} from '../../utils/activityFormat'
import { DASHBOARD_ROUTES } from './DashboardTiles'
import styles from './Dashboard.module.css'

const FEED_SIZE = 8
const REFRESH_MS = 60000

const DOT_CLASS = {
  positive: styles.dotPositive,
  negative: styles.dotNegative,
  info: styles.dotInfo,
  neutral: styles.dotNeutral,
}

const BADGE_CLASS = {
  positive: styles.badgePositive,
  negative: styles.badgeNegative,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
}

export function ActivityFeed({ className = '' }) {
  const { activities, loading, error } = useActivityLogs(
    FEED_SIZE,
    REFRESH_MS
  )

  const initialLoading = loading && activities.length === 0

  return (
    <section
      className={`${styles.tile} ${styles.activityTile} ${className}`}
    >
      <header className={styles.tileHeader}>
        <div>
          <h2 className={styles.tileTitle}>Recent activity</h2>
          <p className={styles.tileSubtitle}>From the audit log</p>
        </div>

        <Link
          to={DASHBOARD_ROUTES.auditLogs}
          className={styles.tileLink}
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </header>

      {error && activities.length === 0 ? (
        <p className={`${styles.tileState} ${styles.tileError}`}>
          Couldn't load activity: {error}
        </p>
      ) : initialLoading ? (
        <div className={styles.skeletonStack}>
          {[0, 1, 2, 3, 4].map((key) => (
            <span
              key={key}
              className={`${styles.skeleton} ${styles.skeletonRow}`}
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className={styles.tileState}>No activity recorded yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {activities.map((activity, index) => {
            const tone = getActionTone(activity.action)
            const entity = formatEntity(activity)

            return (
              <li
                key={activity.id ?? `${activity.timestamp}-${index}`}
                className={styles.timelineItem}
              >
                <span
                  className={`${styles.timelineDot} ${DOT_CLASS[tone]}`}
                  aria-hidden="true"
                />

                <div className={styles.timelineBody}>
                  <p className={styles.timelineHead}>
                    <span className={styles.timelineActor}>
                      {getActorName(activity)}
                    </span>

                    <span
                      className={`${styles.actionBadge} ${BADGE_CLASS[tone]}`}
                    >
                      {formatActionName(activity.action)}
                    </span>
                  </p>

                  {(activity.description || entity) && (
                    <p className={styles.timelineDescription}>
                      {activity.description || entity}
                    </p>
                  )}

                  <time
                    className={styles.timelineTime}
                    dateTime={activity.timestamp}
                    title={formatDateTime(activity.timestamp)}
                  >
                    {formatTimeAgo(activity.timestamp)}
                    {activity.description && entity
                      ? ` · ${entity}`
                      : ''}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}