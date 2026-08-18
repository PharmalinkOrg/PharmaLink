import { Route, Routes } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'

const placeholderPages = [
  ['medicines', 'Medicines'],
  ['inventory', 'Inventory'],
  ['prescriptions', 'Prescriptions'],
  ['reservations', 'Reservations'],
  ['medicine-requests', 'Medicine Requests'],
  ['customers', 'Customers'],
  ['sales', 'Sales'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
]

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
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
