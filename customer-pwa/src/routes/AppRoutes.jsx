import { Route, Routes } from 'react-router-dom'
import CustomerLayout from '../components/layout/CustomerLayout'
import DownloadLandingPage from '../pages/DownloadLandingPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import LoginPage from '../pages/LoginPage'
import ProfilePage from '../pages/ProfilePage'
import PlaceholderPage from '../pages/PlaceholderPage'

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="download" element={<DownloadLandingPage />} />
      <Route path="login" element={<LoginPage />} />

      {/* Customer PWA */}
      <Route element={<CustomerLayout />}>
        <Route index element={<HomePage />} />

        <Route
          path="search"
          element={<PlaceholderPage title="Search medicines" />}
        />

        <Route
          path="reservations"
          element={<PlaceholderPage title="My reservations" />}
        />

        <Route
          path="upload-prescription"
          element={<PlaceholderPage title="Upload prescription" />}
        />

        <Route
          path="request-medicine"
          element={<PlaceholderPage title="Request medicine" />}
        />

        <Route
          path="pharmacies"
          element={<PlaceholderPage title="Nearby pharmacies" />}
        />

        <Route path="profile" element={<ProfilePage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes