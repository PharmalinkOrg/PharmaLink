import { Route, Routes } from 'react-router-dom'

import CustomerLayout from '../components/layout/CustomerLayout'

import DownloadLandingPage from '../pages/DownloadLandingPage'
import LoginPage from '../pages/LoginPage'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import MedicineDetailsPage from '../pages/MedicineDetailsPage'
import PharmaciesPage from '../pages/PharmaciesPage'
import PharmacyDetailsPage from '../pages/PharmacyDetailsPage'
import ProfilePage from '../pages/ProfilePage'
import ReservationsPage from '../pages/ReservationsPage'
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

        {/* Home */}
        <Route
          index
          element={<HomePage />}
        />

        {/* Medicine search */}
        <Route
          path="search"
          element={<SearchPage />}
        />

        {/* Medicine details */}
        <Route
          path="medicine/:medicineId"
          element={<MedicineDetailsPage />}
        />

        {/* Reservations */}
        <Route
          path="reservations"
          element={<ReservationsPage />}
        />

        {/* Upload prescription */}
        <Route
          path="upload-prescription"
          element={
            <PlaceholderPage title="Upload prescription" />
          }
        />

        {/* Request medicine */}
        <Route
          path="request-medicine"
          element={
            <PlaceholderPage title="Request medicine" />
          }
        />

        {/* Pharmacies */}
        <Route
          path="pharmacies"
          element={<PharmaciesPage />}
        />

        {/* Pharmacy details */}
        <Route
          path="pharmacy/:pharmacyId"
          element={<PharmacyDetailsPage />}
        />

        {/* Profile */}
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
    </Routes>
  )
}

export default AppRoutes