import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { 
  LayoutGrid, 
  Pill, 
  ClipboardList, 
  FileText, 
  CalendarCheck, 
  FileEdit, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Settings 
} from 'lucide-react'
import '../../App.css'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutGrid },
  { label: 'Medicines', to: '/medicines', icon: Pill },
  { label: 'Inventory', to: '/inventory', icon: ClipboardList },
  { label: 'Prescriptions', to: '/prescriptions', icon: FileText },
  { label: 'Reservations', to: '/reservations', icon: CalendarCheck },
  { label: 'Medicine Requests', to: '/medicine-requests', icon: FileEdit },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Sales', to: '/sales', icon: TrendingUp },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/FinalLogo.png" alt="PharmaLink" className="brand-logo" />
          <span>Pharmacy Admin</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-account">
          <span>{user.first_name} {user.last_name}</span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
