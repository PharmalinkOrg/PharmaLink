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
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Header */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
          Pharmacies
        </p>

        <h1 className="text-2xl font-extrabold leading-tight text-slate-800">
          Find a pharmacy
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Browse registered pharmacies and view their information.
        </p>
      </div>

      {/* Location */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
          <MapPin size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Your location
          </p>

          <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
            Cebu City, Philippines
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-bold text-emerald-700"
        >
          Change
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Search
          size={19}
          className="shrink-0 text-slate-400"
        />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search pharmacies..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          aria-label="Search pharmacies"
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500">
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
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700'
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
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-200" />

                <div className="flex-1">
                  <div className="h-4 w-40 rounded bg-slate-200" />

                  <div className="mt-2 h-3 w-56 rounded bg-slate-100" />

                  <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
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
                className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Pharmacy Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <MapPin size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-extrabold text-slate-800">
                          {pharmacy.name}
                        </h2>

                        <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
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
                            ? 'bg-emerald-50 text-emerald-700'
                            : pharmacy.status === 'SUSPENDED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {pharmacy.status || 'UNKNOWN'}
                      </span>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {pharmacy.contact_number && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone
                            size={13}
                            className="text-emerald-600"
                          />

                          {pharmacy.contact_number}
                        </span>
                      )}

                      {pharmacy.email && (
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                          <Mail
                            size={13}
                            className="shrink-0 text-emerald-600"
                          />

                          <span className="truncate">
                            {pharmacy.email}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* View */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Clock3
                          size={13}
                          className="text-emerald-600"
                        />

                        Pharmacy information
                      </span>

                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition group-hover:gap-2">
                        View
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <MapPin size={21} />
              </div>

              <h2 className="mt-3 text-sm font-bold text-slate-700">
                No pharmacies found
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Try searching for another pharmacy or turn
                off the Active only filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setShowActiveOnly(false)
                }}
                className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Placeholder */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
            <Navigation size={19} />
          </div>

          <h2 className="mt-3 text-sm font-bold text-slate-700">
            Pharmacy map
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            An interactive map will be connected here later.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PharmaciesPage