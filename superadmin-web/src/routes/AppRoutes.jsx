import { Route, Routes } from 'react-router-dom'

import SuperAdminLayout from '../components/layout/SuperAdminLayout'

import DashboardPage from '../pages/DashboardPage'

import { PharmaciesPage } from '../pages/PharmaciesPage'

import { PharmacyAdminsPage } from '../pages/PharmacyAdminsPage'

import { LoginPage } from '../pages/LoginPage'

import { NotFoundPage } from '../pages/NotFoundPage'

import { UsersPage } from '../pages/UsersPage'

import { AuditLogsPage } from '../pages/AuditLogsPage'

import { SettingsPage } from '../pages/SettingsPage'

import { ReportsPage } from '../pages/ReportsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route element={<SuperAdminLayout />}>
        <Route
          index
          element={<DashboardPage />}
        />

        <Route
          path="pharmacies"
          element={<PharmaciesPage />}
        />

        <Route
          path="pharmacy-admins"
          element={<PharmacyAdminsPage />}
        />

        <Route
          path="reports"
          element={<ReportsPage />}
        />

        <Route
          path="audit-logs"
          element={<AuditLogsPage />}
        />

        <Route
          path="settings"
          element={<SettingsPage />}
        />

        <Route
          path="users"
          element={<UsersPage />}
        />

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>
    </Routes>
  )
}

export default AppRoutes