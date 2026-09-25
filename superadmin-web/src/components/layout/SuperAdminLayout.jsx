// File: superadmin-web/src/components/layout/SuperAdminLayout.jsx

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { 
  LogOut, 
  LayoutGrid, 
  Store, 
  UserCog, 
  Users, 
  UserCheck, 
  BarChart3, 
  ScrollText, 
  Bell, 
  Settings 
} from 'lucide-react'
import '../../App.css'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutGrid },
  { label: 'Pharmacies', to: '/pharmacies', icon: Store },
  { label: 'Pharmacy Admins', to: '/pharmacy-admins', icon: UserCog },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Users', to: '/users', icon: UserCheck },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Audit Logs', to: '/audit-logs', icon: ScrollText },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings', to: '/settings', icon: Settings },
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
        <div className="brand">
          <img src="/FinalLogo.png" alt="PharmaLink" className="brand-logo" />
          <span>Super Admin</span>
        </div>

        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
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