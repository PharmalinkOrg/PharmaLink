import { Route, Routes } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import DashboardPage from '../pages/DashboardPage'
import InventoryPage from '../pages/InventoryPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import ReservationsPage from '../pages/ReservationsPage'
import MedicinesPage from '../pages/MedicinesPage'
import MedicineRequestsPage from '../pages/MedicineRequestsPage'
import CustomersPage from '../pages/CustomersPage'
import PrescriptionsPage from '../pages/PrescriptionsPage' 
import SalesPage from '../pages/SalesPage'
import ReportsPage from '../pages/ReportsPage'
import SettingsPage from '../pages/SettingsPage'

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
          <Route path="sales" element={<SalesPage />} />
          {/* 3. Added the specific route for Prescriptions */}
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          <Route
              path="customers"
              element={<CustomersPage />}
            />
          <Route path="medicine-requests" element={<MedicineRequestsPage />} />
          
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes