import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  MapPin,
  Pill,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'

import { api } from '../lib/api'

const categories = [
  'All',
  'Pain Relief',
  'Vitamins',
  'Cough & Cold',
  'First Aid',
]

function HomePage() {
  const navigate = useNavigate()

  const [partnerPharmacies, setPartnerPharmacies] = useState([])
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true)
  const [pharmaciesError, setPharmaciesError] = useState('')

  // ============================================================
  // LOAD REAL PARTNER PHARMACIES
  // ============================================================

  useEffect(() => {
    let cancelled = false

    const loadPartnerPharmacies = async () => {
      try {
        setPharmaciesLoading(true)
        setPharmaciesError('')

        const pharmacies = await api.getPharmacies()

        if (cancelled) {
          return
        }

        const activePharmacies = Array.isArray(pharmacies)
          ? pharmacies.filter(
              (pharmacy) =>
                String(pharmacy?.status || '').toUpperCase() ===
                'ACTIVE',
            )
          : []

        setPartnerPharmacies(activePharmacies)
      } catch (error) {
        console.error(
          'Unable to load partner pharmacies:',
          error,
        )

        if (!cancelled) {
          setPharmaciesError(
            error?.message ||
              'Unable to load partner pharmacies.',
          )
        }
      } finally {
        if (!cancelled) {
          setPharmaciesLoading(false)
        }
      }
    }

    loadPartnerPharmacies()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep the Home page compact.
  // The full pharmacy list remains available at /pharmacies.
  const featuredPharmacies = partnerPharmacies.slice(0, 2)

  return (
    <section className="home-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="home-header">
        <div>
          <h1 className="home-greeting">
            Good day!
          </h1>

          <div className="home-location">
            <MapPin size={14} strokeWidth={2} />

            <span>
              Find medicines from partner pharmacies
            </span>
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

      {/* ========================================================
          SEARCH
      ======================================================== */}

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

      {/* ========================================================
          QUICK ACTIONS
      ======================================================== */}

      <section className="home-section">
        <div className="home-section-header">
          <h2>What do you need?</h2>
        </div>

        <div className="home-quick-actions">

          {/* Search Medicine */}
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

          {/* Upload Prescription */}
          <button
            type="button"
            onClick={() =>
              navigate('/upload-prescription')
            }
            className="home-action-card"
          >
            <span className="home-action-icon">
              <FileText size={21} />
            </span>

            <span className="home-action-label">
              Upload Prescription
            </span>
          </button>

          {/* Request Medicine */}
          <button
            type="button"
            onClick={() =>
              navigate('/request-medicine')
            }
            className="home-action-card"
          >
            <span className="home-action-icon">
              <Plus size={21} />
            </span>

            <span className="home-action-label">
              Request Medicine
            </span>
          </button>

          {/* My Requests */}
          <button
            type="button"
            onClick={() =>
              navigate('/my-requests')
            }
            className="home-action-card"
          >
            <span className="home-action-icon">
              <ClipboardList size={21} />
            </span>

            <span className="home-action-label">
              My Requests
            </span>
          </button>

        </div>
      </section>

      {/* ========================================================
          CATEGORIES
      ======================================================== */}

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

      {/* ========================================================
          REAL PARTNER PHARMACIES
      ======================================================== */}

      <section className="home-section">
        <div className="home-section-header">
          <h2>Partner pharmacies</h2>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="home-view-all"
          >
            View all
          </button>
        </div>

        {/* Loading state */}
        {pharmaciesLoading && (
          <div className="home-pharmacy-state">
            <span className="home-pharmacy-state-icon">
              <Pill size={18} />
            </span>

            <span>
              Loading partner pharmacies...
            </span>
          </div>
        )}

        {/* Error state */}
        {!pharmaciesLoading && pharmaciesError && (
          <div className="home-pharmacy-state">
            <span className="home-pharmacy-state-icon">
              <Pill size={18} />
            </span>

            <span>
              {pharmaciesError}
            </span>
          </div>
        )}

        {/* Empty state */}
        {!pharmaciesLoading &&
          !pharmaciesError &&
          featuredPharmacies.length === 0 && (
            <div className="home-pharmacy-state">
              <span className="home-pharmacy-state-icon">
                <Pill size={18} />
              </span>

              <span>
                No partner pharmacies are currently available.
              </span>
            </div>
          )}

        {/* Real pharmacy data */}
        {!pharmaciesLoading &&
          !pharmaciesError &&
          featuredPharmacies.length > 0 && (
            <div className="home-pharmacy-list">
              {featuredPharmacies.map((pharmacy) => {
                const pharmacyId =
                  pharmacy.pharmacy_id ?? pharmacy.id

                return (
                  <button
                    key={pharmacyId}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/pharmacy/${pharmacyId}`,
                      )
                    }
                    className="home-pharmacy-card"
                  >
                    <span className="home-pharmacy-icon">
                      <Pill size={19} />
                    </span>

                    <span className="home-pharmacy-info">
                      <span className="home-pharmacy-name">
                        {pharmacy.name ||
                          'Partner Pharmacy'}
                      </span>

                      {pharmacy.address && (
                        <span className="home-pharmacy-meta">
                          {pharmacy.address}
                        </span>
                      )}

                      <span className="home-pharmacy-availability">
                        PharmaLink partner
                      </span>
                    </span>

                    <ChevronRight
                      size={19}
                      className="home-pharmacy-chevron"
                    />
                  </button>
                )
              })}
            </div>
          )}
      </section>

      {/* ========================================================
          AI ASSISTANT
      ======================================================== */}

      <section className="home-ai-card">
        <div className="home-ai-header">
          <span className="home-ai-icon">
            <Sparkles size={19} />
          </span>

          <div className="home-ai-text">
            <h2>
              Need help finding a medicine?
            </h2>

            <p>
              Ask PharmaLink AI about medicines,
              reservations, prescriptions, or how to use
              the app.
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