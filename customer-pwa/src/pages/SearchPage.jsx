import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function SearchPage() {
  const navigate = useNavigate()

  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        setLoading(true)
        setError('')

        const [
          medicinesResponse,
          categoriesResponse,
        ] = await Promise.all([
          apiRequest(
            '/pharmacies/available-medicines'
          ),
          apiRequest('/medicine-categories'),
        ])

        if (!medicinesResponse.success) {
          throw new Error(
            medicinesResponse.message ||
              'Failed to retrieve medicines'
          )
        }

        if (!categoriesResponse.success) {
          throw new Error(
            categoriesResponse.message ||
              'Failed to retrieve medicine categories'
          )
        }

        setMedicines(medicinesResponse.data || [])
        setCategories(categoriesResponse.data || [])
      } catch (error) {
        console.error(
          'Fetch medicine search data error:',
          error
        )

        setError(
          error.message ||
            'Failed to load medicine search'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchSearchData()
  }, [])

  const filteredMedicines = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase()

    return medicines.filter((medicine) => {
      const matchesCategory =
        selectedCategoryId === null ||
        Number(medicine.category_id) ===
          Number(selectedCategoryId)

      const searchableValues = [
        medicine.generic_name,
        medicine.brand_name,
        medicine.dosage,
        medicine.dosage_form,
      ]

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch)
        )

      return matchesCategory && matchesSearch
    })
  }, [
    medicines,
    searchTerm,
    selectedCategoryId,
  ])

  const handleMedicineClick = (medicine) => {
    const representativeOffering =
      medicine.offerings?.[0]

    if (!representativeOffering?.medicine_id) {
      console.error(
        'Medicine has no available offering:',
        medicine
      )
      return
    }

    navigate(
      `/medicine/${representativeOffering.medicine_id}`,
      {
        state: {
          groupedMedicine: medicine,
        },
      }
    )
  }

  const handleAskAssistant = () => {
    const trimmedSearch = searchTerm.trim()

    if (trimmedSearch) {
      navigate('/assistant', {
        state: {
          suggestedMessage:
            `Help me find ${trimmedSearch}.`,
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
          Search medicines and see which pharmacies
          currently have them available.
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
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
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
            Need help using PharmaLink or finding
            medicine information?
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
          <button
            type="button"
            onClick={() =>
              setSelectedCategoryId(null)
            }
            className={`search-category ${
              selectedCategoryId === null
                ? 'search-category-active'
                : ''
            }`}
          >
            All
          </button>

          {categories.map((category) => {
            const isActive =
              Number(selectedCategoryId) ===
              Number(category.category_id)

            return (
              <button
                key={category.category_id}
                type="button"
                onClick={() =>
                  setSelectedCategoryId(
                    category.category_id
                  )
                }
                className={`search-category ${
                  isActive
                    ? 'search-category-active'
                    : ''
                }`}
              >
                {category.name}
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
              onClick={() =>
                window.location.reload()
              }
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
              {filteredMedicines.map(
                (medicine) => {
                  const pharmacyCount =
                    medicine.pharmacy_count || 0

                  return (
                    <button
                      key={medicine.medicine_key}
                      type="button"
                      onClick={() =>
                        handleMedicineClick(
                          medicine
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
                                {
                                  medicine.generic_name
                                }
                              </h3>

                              {medicine.brand_name && (
                                <p>
                                  {
                                    medicine.brand_name
                                  }
                                </p>
                              )}
                            </div>

                            <span className="medicine-active-badge">
                              Available
                            </span>
                          </div>

                          <p className="medicine-dosage">
                            {medicine.dosage ||
                              'Dosage not specified'}

                            {medicine.dosage_form &&
                              ` • ${medicine.dosage_form}`}
                          </p>

                          <p className="medicine-prescription-status">
                            {medicine.requires_prescription
                              ? 'Prescription required'
                              : 'No prescription required'}
                          </p>

                          <div className="medicine-availability-row">
                            <span className="medicine-availability-label">
                              <MapPin size={14} />

                              Available at{' '}
                              {pharmacyCount}{' '}
                              {pharmacyCount === 1
                                ? 'pharmacy'
                                : 'pharmacies'}
                            </span>

                            <span className="medicine-view-link">
                              View
                              <ArrowRight
                                size={14}
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                }
              )}
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
                Try another medicine name, brand,
                dosage, or form.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategoryId(null)
                }}
                className="search-clear-button"
              >
                Clear search
              </button>
            </div>
          )}
      </section>

      {/* Pharmacies */}
      <button
        type="button"
        onClick={() =>
          navigate('/pharmacies')
        }
        className="search-pharmacy-shortcut"
      >
        <span className="search-pharmacy-icon">
          <MapPin size={18} />
        </span>

        <span className="search-pharmacy-text">
          <strong>Browse pharmacies</strong>

          <span>
            View pharmacies and their available
            medicines.
          </span>
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