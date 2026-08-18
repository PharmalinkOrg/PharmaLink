import { Route, Routes } from 'react-router-dom'
import CustomerLayout from '../components/layout/CustomerLayout'
import DownloadLandingPage from '../pages/DownloadLandingPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="download" element={<DownloadLandingPage />} />
      <Route element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<PlaceholderPage title="Search medicines" />} />
        <Route path="reservations" element={<PlaceholderPage title="My reservations" />} />
        <Route path="profile" element={<PlaceholderPage title="My profile" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
