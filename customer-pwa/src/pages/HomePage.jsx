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
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5 sm:px-6">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-teal-700">
            PharmaLink
          </p>

          <h1 className="text-xl font-extrabold tracking-tight text-slate-800 sm:text-2xl">
            Good day!
          </h1>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={14} strokeWidth={2} />
            <span>Finding pharmacies near you</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
        >
          <Bell size={21} strokeWidth={2} />

          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            2
          </span>
        </button>
      </header>

      {/* Search */}
      <button
        type="button"
        onClick={() => navigate('/search')}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        <Search
          size={20}
          strokeWidth={2}
          className="shrink-0 text-slate-400"
        />

        <span className="flex-1 text-sm text-slate-400">
          Search for a medicine...
        </span>

        <span className="text-xs text-slate-400">
          Search
        </span>
      </button>

      {/* Quick Actions */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-700">
            What do you need?
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
              <Pill size={21} />
            </span>

            <span className="text-xs font-bold text-slate-600">
              Search Medicine
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/upload-prescription')}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
              <FileText size={21} />
            </span>

            <span className="text-xs font-bold text-slate-600">
              Upload Prescription
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/request-medicine')}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
              <Plus size={21} />
            </span>

            <span className="text-xs font-bold text-slate-600">
              Request Medicine
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
              <MapPin size={21} />
            </span>

            <span className="text-xs font-bold text-slate-600">
              Nearby Pharmacies
            </span>
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-700">
            Browse categories
          </h2>

          <button
            type="button"
            onClick={() => navigate('/search')}
            className="text-xs font-bold text-slate-500 transition hover:text-teal-700"
          >
            View all
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              onClick={() => navigate('/search')}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                index === 0
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Nearby Pharmacies */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-700">
            Nearby pharmacies
          </h2>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="text-xs font-bold text-slate-500 transition hover:text-teal-700"
          >
            View all
          </button>
        </div>

        <div className="space-y-2.5">
          {nearbyPharmacies.map((pharmacy) => (
            <button
              key={pharmacy.name}
              type="button"
              onClick={() => navigate('/pharmacies')}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Pill size={19} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-700">
                  {pharmacy.name}
                </span>

                <span className="mt-0.5 block text-xs text-slate-500">
                  {pharmacy.distance} · {pharmacy.status}
                </span>

                <span className="mt-0.5 block text-[11px] font-medium text-teal-700">
                  {pharmacy.availability}
                </span>
              </span>

              <ChevronRight
                size={19}
                className="shrink-0 text-slate-400"
              />
            </button>
          ))}
        </div>
      </section>

      {/* AI Assistant */}
      <section className="mt-7 overflow-hidden rounded-2xl bg-slate-800 p-4 shadow-md">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-teal-200">
            <Sparkles size={19} />
          </span>

          <div>
            <h2 className="text-sm font-bold text-white">
              Need help finding a medicine?
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Ask PharmaLink AI about medicines, reservations,
              prescriptions, or how to use the app.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/search')}
          className="mt-4 flex min-h-9 w-full items-center justify-center rounded-lg bg-teal-100 px-4 text-xs font-extrabold text-teal-900 transition hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-800"
        >
          Ask PharmaLink AI
        </button>
      </section>
    </section>
  )
}

export default HomePage