import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  FileText,
  MapPin,
  Pill,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'

const categories = [
  'All',
  'Pain Relief',
  'Vitamins',
  'Cough & Cold',
  'First Aid',
]

const nearbyPharmacies = [
  {
    name: 'PharmaLink Pharmacy',
    distance: '0.8 km away',
    status: 'Open now',
    availability: 'Medicines available',
  },
  {
    name: 'City Care Pharmacy',
    distance: '1.2 km away',
    status: 'Open now',
    availability: 'Medicines available',
  },
]

function HomePage() {
  const navigate = useNavigate()

  return (
    <section className="home-page">
      {/* Header */}
      <header className="home-header">
        <div>
          <h1 className="home-greeting">
            Good day!
          </h1>

          <div className="home-location">
            <MapPin size={14} strokeWidth={2} />
            <span>Finding pharmacies near you</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="home-notification-button"
        >
          <Bell size={21} strokeWidth={2} />

          <span className="home-notification-badge">
            2
          </span>
        </button>
      </header>

      {/* Search */}
      <button
        type="button"
        onClick={() => navigate('/search')}
        className="home-search"
      >
        <Search
          size={20}
          strokeWidth={2}
          className="home-search-icon"
        />

        <span className="home-search-placeholder">
          Search for a medicine...
        </span>

        <span className="home-search-label">
          Search
        </span>
      </button>

      {/* Quick Actions */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>What do you need?</h2>
        </div>

        <div className="home-quick-actions">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="home-action-card"
          >
            <span className="home-action-icon">
              <Pill size={21} />
            </span>

            <span className="home-action-label">
              Search Medicine
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/upload-prescription')}
            className="home-action-card"
          >
            <span className="home-action-icon">
              <FileText size={21} />
            </span>

            <span className="home-action-label">
              Upload Prescription
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/request-medicine')}
            className="home-action-card"
          >
            <span className="home-action-icon">
              <Plus size={21} />
            </span>

            <span className="home-action-label">
              Request Medicine
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="home-action-card"
          >
            <span className="home-action-icon">
              <MapPin size={21} />
            </span>

            <span className="home-action-label">
              Nearby Pharmacies
            </span>
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>Browse categories</h2>

          <button
            type="button"
            onClick={() => navigate('/search')}
            className="home-view-all"
          >
            View all
          </button>
        </div>

        <div className="home-categories">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              onClick={() => navigate('/search')}
              className={`home-category ${
                index === 0
                  ? 'home-category-active'
                  : ''
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Nearby Pharmacies */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>Nearby pharmacies</h2>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="home-view-all"
          >
            View all
          </button>
        </div>

        <div className="home-pharmacy-list">
          {nearbyPharmacies.map((pharmacy) => (
            <button
              key={pharmacy.name}
              type="button"
              onClick={() => navigate('/pharmacies')}
              className="home-pharmacy-card"
            >
              <span className="home-pharmacy-icon">
                <Pill size={19} />
              </span>

              <span className="home-pharmacy-info">
                <span className="home-pharmacy-name">
                  {pharmacy.name}
                </span>

                <span className="home-pharmacy-meta">
                  {pharmacy.distance} · {pharmacy.status}
                </span>

                <span className="home-pharmacy-availability">
                  {pharmacy.availability}
                </span>
              </span>

              <ChevronRight
                size={19}
                className="home-pharmacy-chevron"
              />
            </button>
          ))}
        </div>
      </section>

      {/* AI Assistant */}
      <section className="home-ai-card">
        <div className="home-ai-header">
          <span className="home-ai-icon">
            <Sparkles size={19} />
          </span>

          <div className="home-ai-text">
            <h2>Need help finding a medicine?</h2>

            <p>
              Ask PharmaLink AI about medicines, reservations,
              prescriptions, or how to use the app.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/assistant')}
          className="home-ai-button"
        >
          Ask PharmaLink AI
        </button>
      </section>
    </section>
  )
}

export default HomePage