// File: customer-pwa/src/pages/NotificationsPage.jsx

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileCheck,
  FileX,
  PackageCheck,
  X,
} from 'lucide-react'

import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks/queries/useNotifications'

import './NotificationsPage.css'

// =========================================================
// NOTIFICATION ID
// Works whether your table's key is notification_id or id.
// =========================================================

function getNotificationId(notification) {
  return notification.notification_id ?? notification.id
}

// =========================================================
// WHERE EACH NOTIFICATION OPENS
// Types match the backend: RESERVATION, MEDICINE_REQUEST,
// PRESCRIPTION, SYSTEM. Paths match routes/AppRoutes.jsx.
// SYSTEM notifications are only marked as read (no page).
// =========================================================

const TYPE_ROUTES = {
  RESERVATION: (id) =>
    id ? `/my-reservations/${id}` : '/my-reservations',
  MEDICINE_REQUEST: () => '/my-requests',
  PRESCRIPTION: () => '/upload-prescription',
}

function getRoute(notification) {
  const buildRoute = TYPE_ROUTES[notification.type]

  return buildRoute
    ? buildRoute(notification.reference_id)
    : null
}

// =========================================================
// ICON + COLOR
// Picked from type + metadata.status (set by the backend).
// Older notifications without metadata use the type default.
// =========================================================

const STATUS_STYLES = {
  RESERVATION: {
    CONFIRMED: { icon: CalendarCheck, tone: 'success' },
    COMPLETED: { icon: PackageCheck, tone: 'success' },
    CANCELLED: { icon: CalendarX, tone: 'danger' },
    EXPIRED: { icon: Clock, tone: 'warning' },
  },
  MEDICINE_REQUEST: {
    AVAILABLE: { icon: ClipboardList, tone: 'success' },
    PARTIALLY_AVAILABLE: { icon: ClipboardList, tone: 'warning' },
    UNAVAILABLE: { icon: ClipboardList, tone: 'danger' },
    FULFILLED: { icon: ClipboardList, tone: 'success' },
    CANCELLED: { icon: ClipboardList, tone: 'danger' },
    EXPIRED: { icon: ClipboardList, tone: 'warning' },
  },
  PRESCRIPTION: {
    VERIFIED: { icon: FileCheck, tone: 'success' },
    REJECTED: { icon: FileX, tone: 'danger' },
  },
}

const DEFAULT_STYLES = {
  RESERVATION: { icon: CalendarCheck, tone: 'info' },
  MEDICINE_REQUEST: { icon: ClipboardList, tone: 'info' },
  PRESCRIPTION: { icon: FileCheck, tone: 'info' },
  SYSTEM: { icon: Bell, tone: 'muted' },
}

function getTypeStyle(notification) {
  const status = notification.metadata?.status

  return (
    STATUS_STYLES[notification.type]?.[status] ||
    DEFAULT_STYLES[notification.type] ||
    { icon: Bell, tone: 'info' }
  )
}

// =========================================================
// TIME HELPERS
// =========================================================

const relativeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

function formatRelativeTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  if (abs < 60) return 'Just now'
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return relativeFormatter.format(Math.round(seconds / 86400), 'day')

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getGroupLabel(value) {
  const date = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const day = new Date(date)
  day.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today - day) / 86400000)

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'

  return 'Earlier'
}

function groupNotifications(notifications) {
  const groups = []
  const index = new Map()

  notifications.forEach((notification) => {
    const label = getGroupLabel(notification.created_at)

    if (!index.has(label)) {
      index.set(label, groups.length)
      groups.push({ label, items: [] })
    }

    groups[index.get(label)].items.push(notification)
  })

  return groups
}

// =========================================================
// PAGE
// =========================================================

function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications({ unreadOnly: filter === 'unread' })

  const { data: unreadCount = 0 } = useUnreadNotificationCount()

  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotification = useDeleteNotification()

  const groups = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  )

  function openNotification(notification) {
    if (!notification.is_read) {
      markRead.mutate(getNotificationId(notification))
    }

    const route = getRoute(notification)

    if (route) {
      navigate(route)
    }
  }

  function removeNotification(event, notificationId) {
    event.stopPropagation()
    deleteNotification.mutate(notificationId)
  }

  return (
    <section className="notifications-page">

      {/* HEADER */}

      <header className="notifications-header">
        <button
          type="button"
          className="notifications-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ChevronLeft size={22} />
        </button>

        <h1 className="notifications-title">
          Notifications
        </h1>

        <button
          type="button"
          className="notifications-mark-all"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
        >
          <CheckCheck size={16} />
          <span>Mark all read</span>
        </button>
      </header>

      {/* FILTER TABS */}

      <div className="notifications-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`notifications-tab ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unread'}
          className={`notifications-tab ${filter === 'unread' ? 'is-active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <span className="notifications-tab-count">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* LOADING */}

      {isLoading && (
        <div className="notifications-list" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="notification-skeleton" />
          ))}
        </div>
      )}

      {/* ERROR */}

      {!isLoading && isError && (
        <div className="notifications-state">
          <span className="notifications-state-icon">
            <BellOff size={26} />
          </span>

          <h2>Couldn't load notifications</h2>

          <p>{error?.message || 'Please check your connection and try again.'}</p>

          <button
            type="button"
            className="notifications-retry"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      )}

      {/* EMPTY */}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="notifications-state">
          <span className="notifications-state-icon">
            <Bell size={26} />
          </span>

          <h2>
            {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
          </h2>

          <p>
            {filter === 'unread'
              ? 'You have no unread notifications.'
              : 'Updates on your reservations, medicine requests, and prescriptions will appear here.'}
          </p>
        </div>
      )}

      {/* LIST */}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="notifications-groups">
          {groups.map((group) => (
            <section key={group.label} className="notifications-group">
              <h2 className="notifications-group-label">
                {group.label}
              </h2>

              <ul className="notifications-list">
                {group.items.map((notification) => {
                  const { icon: Icon, tone } = getTypeStyle(notification)
                  const pharmacyNotes = notification.metadata?.notes

                  return (
                    <li key={getNotificationId(notification)}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`notification-card ${
                          notification.is_read ? '' : 'is-unread'
                        }`}
                        onClick={() => openNotification(notification)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openNotification(notification)
                          }
                        }}
                      >
                        <span className={`notification-icon tone-${tone}`}>
                          <Icon size={19} />
                        </span>

                        <span className="notification-body">
                          <span className="notification-title-row">
                            <span className="notification-title">
                              {notification.title}
                            </span>

                            {!notification.is_read && (
                              <span
                                className="notification-unread-dot"
                                aria-label="Unread"
                              />
                            )}
                          </span>

                          <span className="notification-message">
                            {notification.message}
                          </span>

                          {pharmacyNotes && (
                            <span className="notification-note">
                              “{pharmacyNotes}”
                            </span>
                          )}

                          <span className="notification-time">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </span>

                        <button
                          type="button"
                          className="notification-delete"
                          aria-label="Delete notification"
                          onClick={(event) =>
                            removeNotification(
                              event,
                              getNotificationId(notification),
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

export default NotificationsPage