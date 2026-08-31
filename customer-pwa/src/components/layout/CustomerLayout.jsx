import { NavLink, Outlet } from 'react-router-dom'
import '../../App.css'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/search' },
  { label: 'Reservations', to: '/my-reservations' },  // ← Change this
  { label: 'Profile', to: '/profile' },
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
      <nav className="bottom-navigation" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default CustomerLayout
