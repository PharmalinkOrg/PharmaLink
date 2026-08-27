import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  MapPin,
  Navigation,
  Search,
  Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const pharmacies = [
  {
    id: 1,
    name: 'CebuCare Pharmacy',
    address: 'Mabolo, Cebu City',
    distance: '0.8 km',
    rating: '4.8',
    open: true,
    hours: 'Open until 9:00 PM',
    medicines: 24,
  },
  {
    id: 2,
    name: 'SouthMed Pharmacy',
    address: 'Lahug, Cebu City',
    distance: '1.4 km',
    rating: '4.6',
    open: true,
    hours: 'Open until 10:00 PM',
    medicines: 18,
  },
  {
    id: 3,
    name: 'HealthPlus Pharmacy',
    address: 'Banilad, Cebu City',
    distance: '2.1 km',
    rating: '4.7',
    open: true,
    hours: 'Open until 8:00 PM',
    medicines: 31,
  },
  {
    id: 4,
    name: 'MediFirst Pharmacy',
    address: 'Talamban, Cebu City',
    distance: '3.5 km',
    rating: '4.5',
    open: false,
    hours: 'Opens tomorrow at 8:00 AM',
    medicines: 12,
  },
]

function PharmaciesPage() {
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState('')
  const [showOpenOnly, setShowOpenOnly] = useState(false)

  const filteredPharmacies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return pharmacies.filter((pharmacy) => {
      const matchesSearch =
        !normalizedSearch ||
        pharmacy.name.toLowerCase().includes(normalizedSearch) ||
        pharmacy.address.toLowerCase().includes(normalizedSearch)

      const matchesOpen = !showOpenOnly || pharmacy.open

      return matchesSearch && matchesOpen
    })
  }, [searchTerm, showOpenOnly])

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
          Nearby Pharmacies
        </p>

        <h1 className="text-2xl font-extrabold leading-tight text-slate-800">
          Find a pharmacy
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Choose a nearby pharmacy to check medicine availability and reserve
          for pickup.
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
        <Search size={19} className="shrink-0 text-slate-400" />

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
          {filteredPharmacies.length} pharmacies nearby
        </p>

        <button
          type="button"
          onClick={() => setShowOpenOnly((current) => !current)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            showOpenOnly
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          Open now
        </button>
      </div>

      {/* Pharmacy list */}
      <div className="mt-4 space-y-3">
        {filteredPharmacies.length > 0 ? (
          filteredPharmacies.map((pharmacy) => (
            <button
              key={pharmacy.id}
              type="button"
              onClick={() => navigate('/reservations')}
              className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Pharmacy icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MapPin size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name + distance */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-slate-800">
                        {pharmacy.name}
                      </h2>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {pharmacy.address}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs font-bold text-slate-500">
                      {pharmacy.distance}
                    </span>
                  </div>

                  {/* Rating + status */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <Star
                        size={13}
                        fill="currentColor"
                        className="text-amber-500"
                      />
                      {pharmacy.rating}
                    </span>

                    <span
                      className={`flex items-center gap-1 text-xs font-semibold ${
                        pharmacy.open
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      <Clock3 size={13} />
                      {pharmacy.hours}
                    </span>
                  </div>

                  {/* Availability */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      <strong className="text-slate-700">
                        {pharmacy.medicines}
                      </strong>{' '}
                      medicines available
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
              Try searching for another pharmacy or turn off the Open now
              filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setShowOpenOnly(false)
              }}
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Map placeholder */}
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