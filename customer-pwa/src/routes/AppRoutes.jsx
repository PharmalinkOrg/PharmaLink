import { Route, Routes } from 'react-router-dom'
import CustomerLayout from '../components/layout/CustomerLayout'
import DownloadLandingPage from '../pages/DownloadLandingPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import LoginPage from '../pages/LoginPage'
import ProfilePage from '../pages/ProfilePage'
import PlaceholderPage from '../pages/PlaceholderPage'
import PharmaciesPage from '../pages/PharmaciesPage'
import MedicineDetailsPage from '../pages/MedicineDetailsPage'
import SearchPage from '../pages/SearchPage'

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="download" element={<DownloadLandingPage />} />
      <Route path="login" element={<LoginPage />} />

      {/* Customer PWA */}
      <Route element={<CustomerLayout />}>
        <Route index element={<HomePage />} />

        {/* Medicine search */}
        <Route path="search" element={<SearchPage />} />

        {/* Medicine details */}
        <Route
          path="medicine/:medicineId"
          element={<MedicineDetailsPage />}
        />

        {/* Reservations */}
        <Route
          path="reservations"
          element={<PlaceholderPage title="My reservations" />}
        />

        {/* Other customer features */}
        <Route
          path="upload-prescription"
          element={<PlaceholderPage title="Upload prescription" />}
        />

        <Route
          path="request-medicine"
          element={<PlaceholderPage title="Request medicine" />}
        />

        {/* Pharmacies */}
        <Route path="pharmacies" element={<PharmaciesPage />} />

        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes