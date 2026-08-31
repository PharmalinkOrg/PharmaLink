import { Route, Routes } from 'react-router-dom'

import CustomerLayout from '../components/layout/CustomerLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import DownloadLandingPage from '../pages/DownloadLandingPage'
import LoginPage from '../pages/LoginPage'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import MedicineDetailsPage from '../pages/MedicineDetailsPage'
import PharmaciesPage from '../pages/PharmaciesPage'
import PharmacyDetailsPage from '../pages/PharmacyDetailsPage'
import ProfilePage from '../pages/ProfilePage'
import ReservationsPage from '../pages/ReservationsPage'
import MyReservationsPage from '../pages/MyReservationsPage'
import ReservationDetailsPage from '../pages/ReservationDetailsPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import NotFoundPage from '../pages/NotFoundPage'

function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          Public pages
      ========================== */}

      <Route
        path="/download"
        element={<DownloadLandingPage />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* =========================
          Customer PWA
      ========================== */}

      <Route element={<CustomerLayout />}>

        {/* Public browsing */}

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

        {/* =========================
            Protected customer pages
        ========================== */}

        <Route element={<ProtectedRoute />}>

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
            element={
              <PlaceholderPage title="Upload prescription" />
            }
          />

          <Route
            path="request-medicine"
            element={
              <PlaceholderPage title="Request medicine" />
            }
          />

          <Route
            path="profile"
            element={<ProfilePage />}
          />

        </Route>

        {/* Customer 404 */}

        <Route
          path="*"
          element={<NotFoundPage />}
        />

      </Route>
    </Routes>
  )
}

export default AppRoutes