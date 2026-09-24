import { NavLink, Outlet } from 'react-router-dom'
import {
  House,
  Search,
  Upload,
  ClipboardList,
  UserRound,
} from 'lucide-react'
import '../../App.css'

const navigation = [
  {
    label: 'Home',
    to: '/',
    icon: House,
  },
  {
    label: 'Search',
    to: '/search',
    icon: Search,
  },
  {
    label: 'Upload',
    to: '/upload-prescription',
    icon: Upload,
  },
  {
    label: 'Reservations',
    to: '/my-reservations',
    icon: ClipboardList,
  },
  {
    label: 'Profile',
    to: '/profile',
    icon: UserRound,
  },
]

function CustomerLayout() {
  return (
    <div className="customer-layout">
      <header className="app-header">
        <h1 className="brand">PharmaLink</h1>
        <span className="location">Find medicines nearby</span>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav
        className="customer-bottom-nav"
        aria-label="Main navigation"
      >
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `customer-nav-item ${
                  isActive ? 'customer-nav-item-active' : ''
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="customer-nav-icon"
                  />

                  <span className="customer-nav-label">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default CustomerLayout