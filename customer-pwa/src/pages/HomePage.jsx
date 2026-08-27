import { useNavigate } from 'react-router-dom'

const categories = [
  'All',
  'Vitamins',
  'Pain Relief',
  'Antibiotics',
  'Cough & Cold',
]

const nearbyPharmacies = [
  {
    name: 'Rose Pharmacy',
    distance: '0.8 km',
    status: 'Open',
    medicine: 'Paracetamol available',
  },
  {
    name: 'Southstar Drug',
    distance: '1.2 km',
    status: 'Open',
    medicine: 'Paracetamol available',
  },
]

function HomePage() {
  const navigate = useNavigate()

  return (
    <section className="home-page">
      {/* Header */}
      <header className="home-header">
        <div>
          <h2 className="home-greeting">Welcome, Josh!</h2>

          <p className="home-location">
            <span aria-hidden="true">⌖</span>
            <span>Sambag 1, Cebu City</span>
          </p>
        </div>

        <button
          className="home-notification"
          type="button"
          aria-label="Notifications"
        >
          ♡
          <span className="notification-dot">3</span>
        </button>
      </header>

      {/* Main medicine search */}
      <button
        className="home-search"
        type="button"
        onClick={() => navigate('/search')}
        aria-label="Search for medicine"
      >
        <span className="home-search-icon" aria-hidden="true">
          ⌕
        </span>

        <span className="home-search-placeholder">
          Search medicine by brand or name...
        </span>

        <span className="home-search-mic" aria-hidden="true">
          ♫
        </span>
      </button>

      {/* Active Reservation */}
      <section className="home-section">
        <div className="home-section-heading">
          <h2>Active Reservation</h2>
        </div>

        <button
          className="reservation-card"
          type="button"
          onClick={() => navigate('/reservations')}
        >
          <div className="reservation-top">
            <div className="pharmacy-avatar">
              RP
            </div>

            <div className="reservation-info">
              <strong>Rose Pharmacy</strong>
              <span>Paracetamol 500mg</span>
            </div>

            <span className="reservation-status">
              Ready for Pickup
            </span>
          </div>

          <div className="reservation-progress-labels">
            <span>Processing</span>
            <span>Ready</span>
            <span>Picked Up</span>
          </div>

          <div className="reservation-progress">
            <div
              className="reservation-progress-fill"
              style={{ width: '70%' }}
            />
          </div>

          <span className="reservation-details">
            View details
          </span>
        </button>
      </section>

      {/* Quick Actions */}
      <section className="home-quick-actions">
        <button
          className="quick-action-card"
          type="button"
          onClick={() => navigate('/upload-prescription')}
        >
          <span className="quick-action-icon" aria-hidden="true">
            ⇧
          </span>
          <span>Upload Prescription</span>
        </button>

        <button
          className="quick-action-card"
          type="button"
          onClick={() => navigate('/request-medicine')}
        >
          <span className="quick-action-icon" aria-hidden="true">
            +
          </span>
          <span>Request Medicine</span>
        </button>

        <button
          className="quick-action-card"
          type="button"
          onClick={() => navigate('/pharmacies')}
        >
          <span className="quick-action-icon" aria-hidden="true">
            ⌂
          </span>
          <span>Nearby Pharmacies</span>
        </button>

        <button
          className="quick-action-card"
          type="button"
          onClick={() => navigate('/search')}
        >
          <span className="quick-action-icon quick-action-ai" aria-hidden="true">
            ✦
          </span>
          <span>AI Support</span>
        </button>
      </section>

      {/* Categories */}
      <section className="home-section">
        <div className="home-section-heading">
          <h2>Categories</h2>

          <button
            className="home-view-all"
            type="button"
            onClick={() => navigate('/search')}
          >
            View All
          </button>
        </div>

        <div className="category-list">
          {categories.map((category, index) => (
            <button
              key={category}
              className={`category-chip ${index === 0 ? 'active' : ''}`}
              type="button"
              onClick={() => navigate('/search')}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Nearby Pharmacies */}
      <section className="home-section">
        <div className="home-section-heading">
          <h2>Nearby Pharmacies</h2>

          <button
            className="home-view-all"
            type="button"
            onClick={() => navigate('/pharmacies')}
          >
            View All
          </button>
        </div>

        <div className="pharmacy-list">
          {nearbyPharmacies.map((pharmacy) => (
            <button
              key={pharmacy.name}
              className="nearby-pharmacy-card"
              type="button"
              onClick={() => navigate('/search')}
            >
              <span
                className="nearby-pharmacy-icon"
                aria-hidden="true"
              >
                ⌂
              </span>

              <span className="nearby-pharmacy-info">
                <strong>{pharmacy.name}</strong>

                <span>
                  {pharmacy.distance} · {pharmacy.status}
                </span>

                <small>{pharmacy.medicine}</small>
              </span>

              <span className="pharmacy-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* AI Assistance */}
      <section className="home-ai-card">
        <div className="home-ai-content">
          <span className="home-ai-icon" aria-hidden="true">
            ✦
          </span>

          <div>
            <h2>Need help finding a medicine?</h2>

            <p>
              Our AI assistant can help you search and navigate
              PharmaLink quickly.
            </p>
          </div>
        </div>

        <button
          className="home-ai-button"
          type="button"
          onClick={() => navigate('/search')}
        >
          Ask AI
        </button>
      </section>
    </section>
  )
}

export default HomePage