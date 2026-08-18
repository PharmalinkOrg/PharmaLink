import { NavLink, Outlet } from 'react-router-dom'
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
  return (
    <div className="superadmin-layout">
      <aside className="sidebar">
        <h1 className="brand">
          PharmaLink
          <span>Super Admin</span>
        </h1>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default SuperAdminLayout
