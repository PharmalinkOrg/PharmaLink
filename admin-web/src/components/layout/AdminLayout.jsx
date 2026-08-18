import { NavLink, Outlet } from 'react-router-dom'
import '../../App.css'

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Medicines', to: '/medicines' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Prescriptions', to: '/prescriptions' },
  { label: 'Reservations', to: '/reservations' },
  { label: 'Medicine Requests', to: '/medicine-requests' },
  { label: 'Customers', to: '/customers' },
  { label: 'Sales', to: '/sales' },
  { label: 'Reports', to: '/reports' },
  { label: 'Settings', to: '/settings' },
]

function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1 className="brand">
          PharmaLink
          <span>Pharmacy Admin</span>
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

export default AdminLayout
