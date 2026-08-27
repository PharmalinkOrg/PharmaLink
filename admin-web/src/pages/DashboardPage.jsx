import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

function DashboardPage() {
  const { accessToken, user } = useAuth()

  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    setIsLoading(true)
    setError('')

    apiRequest(`/dashboard/${user.pharmacy_id}`, {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setDashboard(response.data)
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, user.pharmacy_id])

  if (isLoading) {
    return (
      <section className="dashboard-page">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-copy">Loading dashboard...</p>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pharmacy Overview</span>

          <h2 className="page-title">Dashboard</h2>

          <p className="page-copy">
            Monitor your pharmacy inventory and customer reservations.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {dashboard && (
        <div className="dashboard-grid">
          <article className="dashboard-card">
            <span>Total Medicines</span>
            <strong>{dashboard.totalMedicines}</strong>
          </article>

          <article className="dashboard-card">
            <span>Inventory Batches</span>
            <strong>{dashboard.totalInventory}</strong>
          </article>

          <article className="dashboard-card">
            <span>Low Stock</span>
            <strong>{dashboard.lowStock}</strong>
          </article>

          <article className="dashboard-card">
            <span>Out of Stock</span>
            <strong>{dashboard.outOfStock}</strong>
          </article>

          <article className="dashboard-card">
            <span>Pending Reservations</span>
            <strong>{dashboard.pendingReservations}</strong>
          </article>

          <article className="dashboard-card">
            <span>Confirmed Reservations</span>
            <strong>{dashboard.confirmedReservations}</strong>
          </article>

          <article className="dashboard-card">
            <span>Completed Reservations</span>
            <strong>{dashboard.completedReservations}</strong>
          </article>
        </div>
      )}
    </section>
  )
}

export default DashboardPage