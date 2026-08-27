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

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Header */}
      <div className="mb-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
          Medicine Search
        </p>

        <h1 className="text-2xl font-extrabold leading-tight text-slate-800">
          Find your medicine
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Search medicines and see which nearby pharmacies have them available.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Search
          size={20}
          strokeWidth={2}
          className="shrink-0 text-slate-400"
        />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search medicine or brand..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          aria-label="Search medicines"
        />
      </div>

      {/* AI assistance */}
      <button
        type="button"
        onClick={() => {
          // AI assistant will be connected here later.
        }}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-left shadow-sm transition hover:bg-slate-700"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-emerald-200">
          <Sparkles size={17} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">
            Ask PharmaLink AI
          </span>

          <span className="mt-0.5 block text-xs text-slate-300">
            Need help understanding or finding a medicine?
          </span>
        </span>

        <ArrowRight size={17} className="shrink-0 text-slate-300" />
      </button>

      {/* Categories */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-700">
            Categories
          </h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const isActive = selectedCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-700">
            {searchTerm ? 'Search results' : 'Available medicines'}
          </h2>

          {!loading && !error && (
            <span className="text-xs text-slate-400">
              {filteredMedicines.length} found
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="mt-3 text-xs font-semibold text-slate-500">
              Loading medicines...
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
            <h3 className="text-sm font-bold text-red-700">
              Unable to load medicines
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-red-600">
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

        {/* Medicine results */}
        {!loading && !error && filteredMedicines.length > 0 && (
          <div className="space-y-3">
            {filteredMedicines.map((medicine) => (
              <button
                key={medicine.medicine_id}
                type="button"
                onClick={() => navigate(`/medicine/${medicine.medicine_id}`)}
                className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Medicine icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-700">
                    Rx
                  </div>

                  {/* Medicine information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-800">
                          {medicine.generic_name}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {medicine.brand_name}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Active
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {medicine.dosage} • {medicine.dosage_form}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <MapPin size={14} className="text-emerald-600" />
                        View pharmacy availability
                      </span>

                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition group-hover:gap-2">
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

        {/* Empty state */}
        {!loading && !error && filteredMedicines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Search size={21} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-700">
              No medicines found
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Try another medicine name, brand, dosage, or form. You can also
              ask PharmaLink AI for assistance.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('All')
              }}
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Nearby pharmacies shortcut */}
      <button
        type="button"
        onClick={() => navigate('/pharmacies')}
        className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-200"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
          <MapPin size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-700">
            Browse nearby pharmacies
          </span>

          <span className="mt-0.5 block text-xs text-slate-500">
            See pharmacies near your location.
          </span>
        </span>

        <ArrowRight size={17} className="text-emerald-700" />
      </button>
    </section>
  )
}

export default SearchPage