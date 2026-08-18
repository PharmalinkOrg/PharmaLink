import { Route, Routes } from 'react-router-dom'
import SuperAdminLayout from '../components/layout/SuperAdminLayout'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'

const placeholderPages = [
  ['pharmacies', 'Pharmacies'],
  ['pharmacy-admins', 'Pharmacy Admins'],
  ['customers', 'Customers'],
  ['users', 'Users'],
  ['reports', 'Reports'],
  ['audit-logs', 'Audit Logs'],
  ['notifications', 'Notifications'],
  ['settings', 'Settings'],
]

function AppRoutes() {
  return (
    <Routes>
      <Route element={<SuperAdminLayout />}>
        <Route index element={<DashboardPage />} />
        {placeholderPages.map(([path, title]) => (
          <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
