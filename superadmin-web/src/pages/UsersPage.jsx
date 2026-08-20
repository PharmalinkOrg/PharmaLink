import { useEffect, useState } from 'react'
import { getSuperAdminUsers } from '../services/userService'

function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) {
    return (
      <section>
        <h2 className="page-title">Users</h2>
        <p className="page-copy">Loading users...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <h2 className="page-title">Users</h2>
        <p className="page-copy">{error}</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="page-title">Users</h2>

      <p className="page-copy">
        Manage pharmacy administrators and customers.
      </p>

      <p>
        Total users: <strong>{users.length}</strong>
      </p>

      <div>
        {users.map((user) => (
          <div key={user.user_id}>
            <strong>
              {user.first_name} {user.last_name}
            </strong>

            <p>{user.email}</p>
            <p>{user.role}</p>
            <p>{user.status}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default UsersPage