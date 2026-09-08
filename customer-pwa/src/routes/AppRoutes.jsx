import { Route, Routes } from 'react-router-dom'

import CustomerLayout from '../components/layout/CustomerLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import LoginPage from '../pages/LoginPage'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import MedicineDetailsPage from '../pages/MedicineDetailsPage'
import PharmaciesPage from '../pages/PharmaciesPage'
import PharmacyDetailsPage from '../pages/PharmacyDetailsPage'
import ProfilePage from '../pages/ProfilePage'
import UploadPrescriptionPage from '../pages/UploadPrescriptionPage'
import RequestMedicinePage from '../pages/RequestMedicinePage'
import ReservationsPage from '../pages/ReservationsPage'
import MyReservationsPage from '../pages/MyReservationsPage'
import ReservationDetailsPage from '../pages/ReservationDetailsPage'
import NotFoundPage from '../pages/NotFoundPage'

function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          Public pages (NOT protected)
      ========================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* =========================
          PROTECTED: Customer PWA
          All routes here require authentication
      ========================== */}

      <Route element={<ProtectedRoute />}>
        <Route element={<CustomerLayout />}>

          {/* Public browsing (but requires login) */}

          <Route
            index
            element={<HomePage />}
          />

          <Route
            path="search"
            element={<SearchPage />}
          />

          <Route
            path="medicine/:medicineId"
            element={<MedicineDetailsPage />}
          />

          <Route
            path="pharmacies"
            element={<PharmaciesPage />}
          />

          <Route
            path="pharmacy/:pharmacyId"
            element={<PharmacyDetailsPage />}
          />

          {/* Protected customer pages */}

          <Route
            path="reservations"
            element={<ReservationsPage />}
          />

          <Route
            path="my-reservations"
            element={<MyReservationsPage />}
          />

          <Route
            path="my-reservations/:reservationId"
            element={<ReservationDetailsPage />}
          />

          <Route
            path="upload-prescription"
            element={<UploadPrescriptionPage />}
          />

          <Route
            path="request-medicine"
            element={<RequestMedicinePage />}
          />

          <Route
            path="profile"
            element={<ProfilePage />}
          />

          {/* Customer 404 */}

          <Route
            path="*"
            element={<NotFoundPage />}
          />

        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes