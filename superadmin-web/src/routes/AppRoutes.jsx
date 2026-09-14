// File: superadmin-web/src/routes/AppRoutes.jsx
import { Route, Routes } from 'react-router-dom'
import SuperAdminLayout from '../components/layout/SuperAdminLayout'
import DashboardPage from '../pages/DashboardPage'
import { PharmaciesPage } from '../pages/PharmaciesPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { UsersPage } from '../pages/UsersPage'

const placeholderPages = [
  ['pharmacy-admins', 'Pharmacy Admins'],
  ['customers', 'Customers'],
  ['reports', 'Reports'],
  ['audit-logs', 'Audit Logs'],
  ['notifications', 'Notifications'],
  ['settings', 'Settings'],
]

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<SuperAdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />

        {placeholderPages.map(([path, title]) => (
          <Route
            key={path}
            path={path}
            element={<PlaceholderPage title={title} />}
          />
        ))}

        <Route path="users" element={<UsersPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes