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
    <div className="customer-layout min-h-screen bg-slate-50 pb-24">
      <header className="app-header">
        <h1 className="brand">PharmaLink</h1>
        <span className="location">Find medicines nearby</span>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-2xl items-center border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(23,60,52,0.08)]"
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
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-teal-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="shrink-0"
                  />

                  <span className="truncate">
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