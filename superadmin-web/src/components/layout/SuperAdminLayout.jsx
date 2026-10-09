// File: superadmin-web/src/components/layout/SuperAdminLayout.jsx

import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LogOut,
  LayoutGrid,
  Store,
  UserCog,
  UserCheck,
  BarChart3,
  ScrollText,
  Bell,
  Pill,
  Settings,
} from 'lucide-react'

import SessionTimeoutDialog from './SessionTimeoutDialog'
import { useIdleLogout } from '../../hooks/useIdleLogout'
import { logoutSuperAdmin } from '../../services/authService'
import {
  SETTINGS_UPDATED_EVENT,
  loadSettings,
} from '../../services/settingsService'

import '../../App.css'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutGrid },
  { label: 'Pharmacies', to: '/pharmacies', icon: Store },
  { label: 'Pharmacy Admins', to: '/pharmacy-admins', icon: UserCog },
  { label: 'Medicine Catalog', to: '/medicines', icon: Pill },
  { label: 'Users', to: '/users', icon: UserCheck },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Audit Logs', to: '/audit-logs', icon: ScrollText },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function SuperAdminLayout() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => loadSettings())

  // Pick up changes saved on the Settings page.
  useEffect(() => {
    const handleSettingsUpdated = (event) =>
      setSettings(event.detail || loadSettings())

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
    return () =>
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
  }, [])

  useEffect(() => {
    document.title = `${settings.general.systemName || 'PharmaLink'} · Super Admin`
  }, [settings.general.systemName])

  const handleLogout = useCallback(
    (reason) => {
      // Remove Super Admin token and stored profile
      logoutSuperAdmin()

      // Return to Super Admin login page
      navigate('/login', {
        replace: true,
        state: reason ? { reason } : undefined,
      })
    },
    [navigate]
  )

  const { secondsLeft, stayActive } = useIdleLogout({
    timeoutMinutes: settings.security.sessionTimeoutMinutes,
    warnBeforeLogout: settings.security.warnBeforeLogout,
    onTimeout: () => handleLogout('session-timeout'),
  })

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
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <button
          type="button"
          className="logout-button"
          onClick={() => handleLogout()}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {secondsLeft !== null && (
        <SessionTimeoutDialog
          secondsLeft={secondsLeft}
          onStay={stayActive}
          onLogout={() => handleLogout()}
        />
      )}
    </div>
  )
}

export default SuperAdminLayout
