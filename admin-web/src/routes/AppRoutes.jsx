import { Route, Routes } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import DashboardPage from '../pages/DashboardPage'
import InventoryPage from '../pages/InventoryPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import ReservationsPage from '../pages/ReservationsPage'
import MedicinesPage from '../pages/MedicinesPage'
import MedicineRequestsPage from '../pages/MedicineRequestsPage'

const placeholderPages = [
  ['medicines', 'Medicines'],
  ['prescriptions', 'Prescriptions'],
  ['medicine-requests', 'Medicine Requests'],
  ['customers', 'Customers'],
  ['sales', 'Sales'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
]
function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="medicines" element={<MedicinesPage />} />
          <Route path="medicine-requests" element={<MedicineRequestsPage />} />
          {placeholderPages.map(([path, title]) => (
            <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes
