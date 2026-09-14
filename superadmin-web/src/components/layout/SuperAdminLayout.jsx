// File: superadmin-web/src/components/layout/SuperAdminLayout.jsx

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import '../../App.css'

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Pharmacies', to: '/pharmacies' },
  { label: 'Pharmacy Admins', to: '/pharmacy-admins' },
  { label: 'Customers', to: '/customers' },
  { label: 'Users', to: '/users' },
  { label: 'Reports', to: '/reports' },
  { label: 'Audit Logs', to: '/audit-logs' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Settings', to: '/settings' },
]

function SuperAdminLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Remove Super Admin authentication token
    sessionStorage.removeItem('pharmalink_access_token')

    // Return to Super Admin login page
    navigate('/login', { replace: true })
  }

  return (
    <div className="superadmin-layout">
      <aside className="sidebar">
        <h1 className="brand">
          PharmaLink
          <span>Super Admin</span>
        </h1>

        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default SuperAdminLayout