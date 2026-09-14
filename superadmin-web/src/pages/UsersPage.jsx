// File: superadmin-web/src/pages/UsersPage.jsx

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { getSuperAdminUsers } from '../services/userService'
import './UsersPage.css'

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await getSuperAdminUsers()
        setUsers(data)
      } catch (error) {
        console.error('Failed to fetch Super Admin users:', error)
        setError(error.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return users

    return users.filter((user) =>
      [
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        user.role,
        user.status,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    )
  }, [users, search])

  const formatRole = (role) => {
    return String(role || '')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  return (
    <section className="users-page">
      <div className="users-header">
        <div>
          <div className="users-title">
            <Users size={24} />
            <h2>Users</h2>
          </div>

          <p>
            Manage pharmacy administrators and customers.
          </p>
        </div>

        <div className="users-count">
          <strong>{users.length}</strong>
          <span>Total Users</span>
        </div>
      </div>

      <div className="users-toolbar">
        <div className="users-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="users-table-card">
        {loading ? (
          <div className="users-state">
            Loading users...
          </div>
        ) : error ? (
          <div className="users-state users-error">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-state">
            {search
              ? 'No users match your search.'
              : 'No users found.'}
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
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.first_name?.charAt(0)}
                          {user.last_name?.charAt(0)}
                        </div>

                        <div>
                          <strong>
                            {user.first_name} {user.last_name}
                          </strong>

                          <span className="user-id">
                            ID #{user.user_id}
                          </span>
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
                      </div>
                    </td>

                    <td>
                      <span
                        className={`role-badge ${String(
                          user.role || ''
                        ).toLowerCase()}`}
                      >
                        <ShieldCheck size={14} />
                        {formatRole(user.role)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`user-status ${String(
                          user.status || ''
                        ).toLowerCase()}`}
                      >
                        {user.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="users-footer">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}
    </section>
  )
} 