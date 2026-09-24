import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, MapPin, Search, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const categories = [
  'All',
  'Pain Relief',
  'Cold & Flu',
  'Vitamins',
  'Allergy',
  'Digestive',
]

function SearchPage() {
  const navigate = useNavigate()

  const [medicines, setMedicines] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await apiRequest('/medicines')

        if (!response.success) {
          throw new Error(
            response.message || 'Failed to retrieve medicines',
          )
        }

        setMedicines(response.data || [])
      } catch (error) {
        console.error('Fetch medicines error:', error)
        setError(error.message || 'Failed to load medicines')
      } finally {
        setLoading(false)
      }
    }

    fetchMedicines()
  }, [])

  const filteredMedicines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return medicines.filter((medicine) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        medicine.category_name === selectedCategory

      const matchesSearch =
        !normalizedSearch ||
        medicine.generic_name?.toLowerCase().includes(normalizedSearch) ||
        medicine.brand_name?.toLowerCase().includes(normalizedSearch) ||
        medicine.dosage?.toLowerCase().includes(normalizedSearch) ||
        medicine.dosage_form?.toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [medicines, searchTerm, selectedCategory])

  const handleAskAssistant = () => {
    const trimmedSearch = searchTerm.trim()

    if (trimmedSearch) {
      navigate('/assistant', {
        state: {
          suggestedMessage: `Help me find ${trimmedSearch}.`,
        },
      })

      return
    }

    navigate('/assistant')
  }

  return (
    <section className="search-page">
      {/* Header */}
      <header className="search-page-header">
        <p className="search-eyebrow">
          Medicine Search
        </p>

        <h1>Find your medicine</h1>

        <p className="search-description">
          Search medicines and see which nearby pharmacies
          have them available.
        </p>
      </header>

      {/* Search */}
      <div className="medicine-search-box">
        <Search
          size={20}
          strokeWidth={2}
          className="medicine-search-icon"
        />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search medicine or brand..."
          aria-label="Search medicines"
        />
      </div>

      {/* AI assistance */}
      <button
        type="button"
        onClick={handleAskAssistant}
        className="search-ai-card"
      >
        <span className="search-ai-icon">
          <Sparkles size={17} />
        </span>

        <span className="search-ai-text">
          <strong>Ask PharmaLink AI</strong>
          <span>
            Need help understanding or finding a medicine?
          </span>
        </span>

        <ArrowRight
          size={17}
          className="search-ai-arrow"
        />
      </button>

      {/* Categories */}
      <section className="search-section">
        <div className="search-section-header">
          <h2>Categories</h2>
        </div>

        <div className="search-categories">
          {categories.map((category) => {
            const isActive = selectedCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`search-category ${
                  isActive ? 'search-category-active' : ''
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      {/* Results */}
      <section className="search-section">
        <div className="search-section-header">
          <h2>
            {searchTerm
              ? 'Search results'
              : 'Available medicines'}
          </h2>

          {!loading && !error && (
            <span className="search-result-count">
              {filteredMedicines.length} found
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="search-state-card">
            <div className="search-loading-spinner" />

            <p>Loading medicines...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="search-error-card">
            <h3>Unable to load medicines</h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!loading &&
          !error &&
          filteredMedicines.length > 0 && (
            <div className="medicine-result-list">
              {filteredMedicines.map((medicine) => (
                <button
                  key={medicine.medicine_id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/medicine/${medicine.medicine_id}`,
                    )
                  }
                  className="medicine-result-card"
                >
                  <div className="medicine-result-content">
                    <div className="medicine-rx-icon">
                      Rx
                    </div>

                    <div className="medicine-result-info">
                      <div className="medicine-result-heading">
                        <div>
                          <h3>
                            {medicine.generic_name}
                          </h3>

                          <p>
                            {medicine.brand_name}
                          </p>
                        </div>

                        <span className="medicine-active-badge">
                          Active
                        </span>
                      </div>

                      <p className="medicine-dosage">
                        {medicine.dosage} •{' '}
                        {medicine.dosage_form}
                      </p>

                      <div className="medicine-availability-row">
                        <span className="medicine-availability-label">
                          <MapPin size={14} />
                          View pharmacy availability
                        </span>

                        <span className="medicine-view-link">
                          View
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredMedicines.length === 0 && (
            <div className="search-empty-card">
              <div className="search-empty-icon">
                <Search size={21} />
              </div>

              <h3>No medicines found</h3>

              <p>
                Try another medicine name, brand, dosage,
                or form. You can also ask PharmaLink AI
                for assistance.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('All')
                }}
                className="search-clear-button"
              >
                Clear search
              </button>
            </div>
          )}
      </section>

      {/* Nearby pharmacies */}
      <button
        type="button"
        onClick={() => navigate('/pharmacies')}
        className="search-pharmacy-shortcut"
      >
        <span className="search-pharmacy-icon">
          <MapPin size={18} />
        </span>

        <span className="search-pharmacy-text">
          <strong>Browse nearby pharmacies</strong>
          <span>See pharmacies near your location.</span>
        </span>

        <ArrowRight
          size={17}
          className="search-pharmacy-arrow"
        />
      </button>
    </section>
  )
}

export default SearchPage