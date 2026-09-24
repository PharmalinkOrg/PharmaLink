import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function PharmaciesPage() {
  const navigate = useNavigate()

  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await apiRequest('/pharmacies')

        setPharmacies(response.data || [])
      } catch (error) {
        console.error('Failed to load pharmacies:', error)
        setError('Unable to load pharmacies.')
      } finally {
        setLoading(false)
      }
    }

    loadPharmacies()
  }, [])

  const filteredPharmacies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return pharmacies.filter((pharmacy) => {
      const matchesSearch =
        !normalizedSearch ||
        pharmacy.name?.toLowerCase().includes(normalizedSearch) ||
        pharmacy.address?.toLowerCase().includes(normalizedSearch)

      const matchesStatus =
        !showActiveOnly || pharmacy.status === 'ACTIVE'

      return matchesSearch && matchesStatus
    })
  }, [pharmacies, searchTerm, showActiveOnly])

  return (
    <section className="pharmacies-customer-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Header */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--primary-hover)]"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
          Pharmacies
        </p>

        <h1 className="text-2xl font-extrabold leading-tight text-[var(--text-primary)]">
          Find a pharmacy
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          Browse registered pharmacies and view their information.
        </p>
      </div>

      {/* Location */}
      <div className="pharmacy-location-card mb-4 flex items-center gap-3 rounded-2xl p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)] shadow-sm">
          <MapPin size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
            Your location
          </p>

          <p className="mt-0.5 truncate text-sm font-bold text-[var(--text-primary)]">
            Cebu City, Philippines
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-bold text-[var(--primary)]"
        >
          Change
        </button>
      </div>

      {/* Search */}
      <div className="pharmacy-search-box flex items-center gap-2 rounded-2xl px-4 py-3">
        <Search
          size={19}
          className="shrink-0 text-[var(--text-muted)]"
        />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search pharmacies..."
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          aria-label="Search pharmacies"
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--text-secondary)]">
          {filteredPharmacies.length}{' '}
          {filteredPharmacies.length === 1
            ? 'pharmacy'
            : 'pharmacies'}
        </p>

        <button
          type="button"
          onClick={() =>
            setShowActiveOnly((current) => !current)
          }
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            showActiveOnly
              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary-muted)] hover:text-[var(--primary-hover)]'
          }`}
        >
          Active only
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-[var(--border)]" />

                <div className="flex-1">
                  <div className="h-4 w-40 rounded bg-[var(--border)]" />

                  <div className="mt-2 h-3 w-56 rounded bg-[var(--surface-soft)]" />

                  <div className="mt-3 h-3 w-32 rounded bg-[var(--surface-soft)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
          <p className="text-sm font-bold text-red-700">
            Unable to load pharmacies
          </p>

          <p className="mt-1 text-xs text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Pharmacy List */}
      {!loading && !error && (
        <div className="mt-4 space-y-3">
          {filteredPharmacies.length > 0 ? (
            filteredPharmacies.map((pharmacy) => (
              <button
                key={pharmacy.pharmacy_id}
                type="button"
                onClick={() =>
                  navigate(
                    `/pharmacy/${pharmacy.pharmacy_id}`
                  )
                }
                className="pharmacy-list-card group w-full rounded-2xl p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Pharmacy Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
                    <MapPin size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-extrabold text-[var(--text-primary)]">
                          {pharmacy.name}
                        </h2>

                        <p className="mt-1 flex items-start gap-1 text-xs text-[var(--text-secondary)]">
                          <MapPin
                            size={13}
                            className="mt-0.5 shrink-0"
                          />

                          <span>
                            {pharmacy.address ||
                              'Address not available'}
                          </span>
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                          pharmacy.status === 'ACTIVE'
                            ? 'bg-[var(--success-bg)] text-[var(--success)]'
                            : pharmacy.status === 'SUSPENDED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-[var(--surface-soft)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {pharmacy.status || 'UNKNOWN'}
                      </span>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {pharmacy.contact_number && (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Phone
                            size={13}
                            className="text-[var(--primary)]"
                          />

                          {pharmacy.contact_number}
                        </span>
                      )}

                      {pharmacy.email && (
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Mail
                            size={13}
                            className="shrink-0 text-[var(--primary)]"
                          />

                          <span className="truncate">
                            {pharmacy.email}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* View */}
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                        <Clock3
                          size={13}
                          className="text-[var(--primary)]"
                        />

                        Pharmacy information
                      </span>

                      <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] transition group-hover:gap-2">
                        View
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--text-muted)]">
                <MapPin size={21} />
              </div>

              <h2 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                No pharmacies found
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                Try searching for another pharmacy or turn
                off the Active only filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setShowActiveOnly(false)
                }}
                className="pharmacy-primary-button mt-4 rounded-xl px-4 py-2.5 text-xs font-bold"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Placeholder */}
      <div className="pharmacy-map-placeholder mt-6 overflow-hidden rounded-2xl">
        <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)] shadow-sm">
            <Navigation size={19} />
          </div>

          <h2 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
            Pharmacy map
          </h2>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            An interactive map will be connected here later.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PharmaciesPage