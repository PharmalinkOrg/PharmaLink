// File: superadmin-web/src/pages/NotificationsPage.jsx

import { useMemo, useState } from 'react'
import { Bell, Search, CheckCircle, AlertCircle, Info } from 'lucide-react'
import './NotificationsPage.css'

const notifications = [
  {
    id: 1,
    type: 'success',
    title: 'Pharmacy Approved',
    message: 'Metro Pharmacy has been successfully approved and activated.',
    date: '2026-09-27 10:30',
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'New Pharmacy Registration',
    message: 'HealthCare Pharmacy submitted a registration request.',
    date: '2026-09-27 09:15',
    read: false,
  },
  {
    id: 3,
    type: 'info',
    title: 'System Update',
    message: 'System maintenance scheduled for tonight at 2:00 AM.',
    date: '2026-09-26 16:45',
    read: true,
  },
  {
    id: 4,
    type: 'success',
    title: 'Admin Account Created',
    message: 'New pharmacy admin account created for City Pharmacy.',
    date: '2026-09-26 14:20',
    read: true,
  },
  {
    id: 5,
    type: 'info',
    title: 'Report Generated',
    message: 'Monthly pharmacy registration report is ready.',
    date: '2026-09-26 11:00',
    read: true,
  },
]

export function NotificationsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const notificationsPerPage = 5

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase()

    let filtered = notifications

    // Filter by read/unread
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.read)
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.read)
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter((n) =>
        [n.title, n.message, n.type].some((value) =>
          String(value || '').toLowerCase().includes(query)
        )
      )
    }

    return filtered
  }, [search, filter])

  const totalPages = Math.ceil(
    filteredNotifications.length / notificationsPerPage
  )

  const startIndex = (currentPage - 1) * notificationsPerPage

  const displayedNotifications = filteredNotifications.slice(
    startIndex,
    startIndex + notificationsPerPage
  )

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = (event) => {
    setFilter(event.target.value)
    setCurrentPage(1)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} />
      case 'warning':
        return <AlertCircle size={18} />
      case 'info':
      default:
        return <Info size={18} />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <div className="page-header-sticky">
        <div className="notifications-header">
          <div>
            <div className="notifications-title-row">
              <h1>Notifications</h1>
            </div>

            <p>View and manage system notifications and alerts.</p>
          </div>

          <div className="notifications-stats">
            <div className="stat-badge">
              <strong>{notifications.length}</strong>
              <span>Total</span>
            </div>
            <div className="stat-badge unread">
              <strong>{unreadCount}</strong>
              <span>Unread</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="notifications-page">
          <div className="notifications-toolbar">
            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={handleSearch}
              />
            </div>

            <div className="filter-box">
              <select value={filter} onChange={handleFilterChange}>
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
            </div>
          </div>

          <div className="notifications-list">
            {displayedNotifications.length === 0 ? (
              <div className="notifications-empty">
                {search
                  ? 'No notifications match your search.'
                  : 'No notifications found.'}
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.type} ${
                    notification.read ? 'read' : 'unread'
                  }`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-header">
                      <h3>{notification.title}</h3>
                      {!notification.read && (
                        <span className="unread-indicator"></span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <span className="notification-date">{notification.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredNotifications.length > 0 && (
            <div className="notifications-footer">
              <span>
                Showing {startIndex + 1}–
                {Math.min(
                  startIndex + notificationsPerPage,
                  filteredNotifications.length
                )}{' '}
                of {filteredNotifications.length} notifications
              </span>

              <div className="pagination">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(page + 1, totalPages)
                    )
                  }
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
