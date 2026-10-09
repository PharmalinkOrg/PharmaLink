// File: superadmin-web/src/pages/UsersPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Filter,
  Mail,
  Phone,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react'

import ConfirmActionDialog from '../components/common/ConfirmActionDialog'
import { getCurrentUser } from '../services/authService'
import { getAllSuperAdminUsers, updateUserStatus } from '../services/userService'
import { USER_ACTIONS, getUserActions } from '../utils/statusActions'

import './UsersPage.css'

/* ============================================================
   CONSTANTS
============================================================ */

const USERS_PER_PAGE = 10

const ROLE_FILTERS = [
  { id: 'all', label: 'All Users', icon: Users },
  { id: 'PHARMACY_ADMIN', label: 'Pharmacy Admins', icon: UserCog },
  { id: 'CUSTOMER', label: 'Customers', icon: User },
]

/* ============================================================
   HELPERS
============================================================ */

const getUserId = (user) => user?.user_id ?? user?.id ?? user?.email

// "Pharmacy Admin", "pharmacy-admin", "PHARMACY_ADMIN" → "PHARMACY_ADMIN"
const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const formatRole = (role) =>
  String(role || 'Unknown')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const normalizeStatus = (status) => String(status || '').trim().toUpperCase()

const getFullName = (user) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unnamed user'

const normalizeText = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

/* ============================================================
   USERS PAGE
============================================================ */

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [notice, setNotice] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [currentUser] = useState(() => getCurrentUser())

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  /* ==========================================================
     LOAD
  ========================================================== */

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      setUsers(await getAllSuperAdminUsers())
    } catch (loadError) {
      console.error('Failed to fetch Super Admin users:', loadError)
      setError(loadError.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  /* ==========================================================
     COUNTS PER ROLE
  ========================================================== */

  const roleCounts = useMemo(() => {
    const counts = { all: users.length }

    users.forEach((user) => {
      const role = normalizeRole(user.role)
      counts[role] = (counts[role] || 0) + 1
    })

    return counts
  }, [users])

  /* ==========================================================
     FILTER + SEARCH
  ========================================================== */

  const filteredUsers = useMemo(() => {
    const tokens = normalizeText(search).split(' ').filter(Boolean)

    return users.filter((user) => {
      if (roleFilter !== 'all' && normalizeRole(user.role) !== roleFilter) {
        return false
      }

      if (statusFilter !== 'all' && normalizeStatus(user.status) !== statusFilter) {
        return false
      }

      if (tokens.length === 0) {
        return true
      }

      const haystack = normalizeText(
        [
          user.first_name,
          user.last_name,
          user.email,
          user.phone,
          formatRole(user.role),
          user.status,
          getUserId(user),
        ].join(' ')
      )

      // Every word must match, so "aziel customer" finds the
      // customer account, not the pharmacy admin.
      return tokens.every((token) => haystack.includes(token))
    })
  }, [users, search, roleFilter, statusFilter])

  const statusOptions = useMemo(
    () => [...new Set(users.map((user) => normalizeStatus(user.status)).filter(Boolean))].sort(),
    [users]
  )

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * USERS_PER_PAGE

  const displayedUsers = filteredUsers.slice(
    startIndex,
    startIndex + USERS_PER_PAGE
  )

  /* ==========================================================
     HANDLERS
  ========================================================== */

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const handleRoleFilter = (role) => {
    setRoleFilter(role)
    setCurrentPage(1)
  }

  const confirmStatusAction = async (reason) => {
    const { type, user } = pendingAction
    const action = USER_ACTIONS[type]
    const userId = getUserId(user)

    const updated = await updateUserStatus(userId, action.nextStatus, reason)

    setUsers((current) =>
      current.map((item) =>
        getUserId(item) === userId
          ? {
              ...item,
              status: action.nextStatus,
              ...(updated && typeof updated === 'object' ? updated : {}),
            }
          : item
      )
    )

    setPendingAction(null)
    setNotice(action.notice(getFullName(user)))
  }

  const activeAction = pendingAction ? USER_ACTIONS[pendingAction.type] : null

  const activeFilter = ROLE_FILTERS.find((filter) => filter.id === roleFilter)

  const resultLabel =
    roleFilter === 'PHARMACY_ADMIN'
      ? filteredUsers.length === 1
        ? 'pharmacy admin'
        : 'pharmacy admins'
      : roleFilter === 'CUSTOMER'
        ? filteredUsers.length === 1
          ? 'customer'
          : 'customers'
        : filteredUsers.length === 1
          ? 'user'
          : 'users'

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <div className="page-header-sticky">
        <div className="users-header">
          <div>
            <div className="users-title">
              <h2>Users</h2>
            </div>

            <p>Manage pharmacy administrators and customers.</p>
          </div>

          <div className="users-count">
            <strong>{users.length}</strong>
            <span>Total {users.length === 1 ? 'User' : 'Users'}</span>
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <section className="users-page">
          {notice && (
            <div className="users-notice" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {/* ROLE TABS */}

          <div className="users-role-tabs" role="tablist" aria-label="Filter users by role">
            {ROLE_FILTERS.map((filter) => {
              const Icon = filter.icon
              const isActive = roleFilter === filter.id

              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`users-role-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleRoleFilter(filter.id)}
                >
                  <Icon size={16} />
                  <span>{filter.label}</span>
                  <span className="users-role-count">
                    {loading ? '…' : roleCounts[filter.id] || 0}
                  </span>
                </button>
              )
            })}
          </div>

          {/* TOOLBAR */}

          <div className="users-toolbar">
            <div className="users-search">
              <Search size={18} />

              <input
                type="text"
                placeholder={`Search ${activeFilter.label.toLowerCase()} by name, email, or phone...`}
                value={search}
                onChange={handleSearch}
              />

              {search && (
                <button
                  type="button"
                  className="users-search-clear"
                  onClick={() => {
                    setSearch('')
                    setCurrentPage(1)
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <label className="users-filter">
              <Filter size={16} />
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter by account status"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="users-refresh-button"
              onClick={loadUsers}
              disabled={loading}
              aria-label="Refresh users"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'users-spin' : ''} />
            </button>
          </div>

          {/* TABLE */}

          <div className="users-table-card">
            {loading && users.length === 0 ? (
              <div className="users-state">Loading users...</div>
            ) : error ? (
              <div className="users-state users-error">
                <span>{error}</span>
                <button type="button" className="users-state-button" onClick={loadUsers}>
                  Try again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="users-state">
                <span>
                  {search
                    ? `No ${resultLabel} match your search.`
                    : `No ${resultLabel} found.`}
                </span>

                {search && (
                  <button
                    type="button"
                    className="users-state-button"
                    onClick={() => setSearch('')}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="users-actions-heading">
                        <span className="users-sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedUsers.map((user) => {
                      const role = normalizeRole(user.role)

                      return (
                        <tr key={getUserId(user)}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar">
                                {user.first_name?.charAt(0)}
                                {user.last_name?.charAt(0)}
                              </div>

                              <div>
                                <strong>{getFullName(user)}</strong>

                                <span className="user-id">ID #{getUserId(user)}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="contact-cell">
                              {user.email && (
                                <div>
                                  <Mail size={14} />
                                  <span>{user.email}</span>
                                </div>
                              )}

                              {user.phone && (
                                <div>
                                  <Phone size={14} />
                                  <span>{user.phone}</span>
                                </div>
                              )}

                              {!user.email && !user.phone && (
                                <span className="users-empty-value">—</span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className={`role-badge ${role.toLowerCase()}`}>
                              {role === 'CUSTOMER' ? (
                                <User size={14} />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                              {formatRole(user.role)}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`user-status ${String(user.status || '').toLowerCase()}`}
                            >
                              {user.status || 'Unknown'}
                            </span>
                          </td>

                          <td className="users-actions-cell">
                            {getUserActions(user, currentUser).map((type) => (
                              <button
                                key={type}
                                type="button"
                                className={`users-action-button action-${type}`}
                                onClick={() => setPendingAction({ type, user })}
                              >
                                <Power size={14} />
                                {USER_ACTIONS[type].label}
                              </button>
                            ))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FOOTER */}

          {!error && filteredUsers.length > 0 && (
            <div className="users-footer">
              <span>
                Showing {startIndex + 1}–
                {Math.min(startIndex + USERS_PER_PAGE, filteredUsers.length)} of{' '}
                {filteredUsers.length} {resultLabel}
              </span>

              <div className="users-pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>

                <span>
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <ConfirmActionDialog
            open={Boolean(pendingAction)}
            tone={activeAction?.tone}
            title={activeAction?.title(getFullName(pendingAction?.user))}
            message={activeAction?.message}
            details={
              pendingAction && (
                <>
                  <strong>{getFullName(pendingAction.user)}</strong>
                  <div>
                    {formatRole(pendingAction.user.role)} · {pendingAction.user.email}
                  </div>
                </>
              )
            }
            confirmLabel={activeAction?.confirmLabel}
            reasonMode={activeAction?.reasonMode}
            reasonPlaceholder={activeAction?.reasonPlaceholder}
            onConfirm={confirmStatusAction}
            onClose={() => setPendingAction(null)}
          />
        </section>
      </div>
    </>
  )
}
