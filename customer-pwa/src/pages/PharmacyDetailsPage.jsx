import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  MapPin,
  Search,
  Star,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

const pharmacies = [
  {
    id: 1,
    name: 'CebuCare Pharmacy',
    address: 'Mabolo, Cebu City',
    distance: '0.8 km',
    rating: '4.8',
    open: true,
    hours: 'Open until 9:00 PM',
  },
  {
    id: 2,
    name: 'SouthMed Pharmacy',
    address: 'Lahug, Cebu City',
    distance: '1.4 km',
    rating: '4.6',
    open: true,
    hours: 'Open until 10:00 PM',
  },
  {
    id: 3,
    name: 'HealthPlus Pharmacy',
    address: 'Banilad, Cebu City',
    distance: '2.1 km',
    rating: '4.7',
    open: true,
    hours: 'Open until 8:00 PM',
  },
  {
    id: 4,
    name: 'MediFirst Pharmacy',
    address: 'Talamban, Cebu City',
    distance: '3.5 km',
    rating: '4.5',
    open: false,
    hours: 'Opens tomorrow at 8:00 AM',
  },
]

const medicines = [
  {
    id: 1,
    name: 'Paracetamol',
    brand: 'Biogesic',
    dosage: '500 mg',
    form: 'Tablet',
    stock: 'In Stock',
  },
  {
    id: 2,
    name: 'Cetirizine',
    brand: 'Allerkast',
    dosage: '10 mg',
    form: 'Tablet',
    stock: 'In Stock',
  },
  {
    id: 3,
    name: 'Vitamin C',
    brand: 'Ceelin',
    dosage: '500 mg',
    form: 'Tablet',
    stock: 'In Stock',
  },
  {
    id: 4,
    name: 'Loperamide',
    brand: 'Diatabs',
    dosage: '2 mg',
    form: 'Capsule',
    stock: 'Limited',
  },
]

function PharmacyDetailsPage() {
  const navigate = useNavigate()
  const { pharmacyId } = useParams()

  const [searchTerm, setSearchTerm] = useState('')

  const pharmacy = pharmacies.find(
    (item) => item.id === Number(pharmacyId),
  )

  const filteredMedicines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return medicines
    }

    return medicines.filter(
      (medicine) =>
        medicine.name.toLowerCase().includes(normalizedSearch) ||
        medicine.brand.toLowerCase().includes(normalizedSearch),
    )
  }, [searchTerm])

  if (!pharmacy) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
        <button
          type="button"
          onClick={() => navigate('/pharmacies')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back to pharmacies
        </button>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <MapPin
            size={24}
            className="mx-auto text-slate-400"
          />

          <h1 className="mt-3 text-lg font-extrabold text-slate-700">
            Pharmacy not found
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            The pharmacy you are looking for does not exist.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Pharmacy header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <MapPin size={25} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-slate-800">
              {pharmacy.name}
            </h1>

            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={13} />
              {pharmacy.address}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Star
                  size={13}
                  fill="currentColor"
                  className="text-amber-500"
                />
                {pharmacy.rating}
              </span>

              <span className="text-xs font-semibold text-slate-500">
                {pharmacy.distance}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                  pharmacy.open
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {pharmacy.open ? 'Open now' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Clock3 size={17} className="text-emerald-600" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Operating hours
            </p>

            <p className="mt-0.5 text-xs font-semibold text-slate-600">
              {pharmacy.hours}
            </p>
          </div>
        </div>
      </div>

      {/* Search medicines */}
      <div className="mt-6">
        <h2 className="text-sm font-extrabold text-slate-700">
          Medicines available
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Search medicines currently available at this pharmacy.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
          <Search
            size={19}
            className="shrink-0 text-slate-400"
          />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search medicines..."
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            aria-label="Search medicines in pharmacy"
          />
        </div>
      </div>

      {/* Medicine list */}
      <div className="mt-4 space-y-3">
        {filteredMedicines.length > 0 ? (
          filteredMedicines.map((medicine) => (
            <button
              key={medicine.id}
              type="button"
              onClick={() =>
                navigate(`/medicine/${medicine.id}`)
              }
              className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-extrabold text-emerald-700">
                  Rx
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-slate-800">
                        {medicine.name}
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {medicine.brand}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        medicine.stock === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {medicine.stock}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {medicine.dosage} • {medicine.form}
                  </p>

                  <div className="mt-3 flex items-center justify-end">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition group-hover:gap-2">
                      View medicine
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <Search
              size={21}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 text-sm font-bold text-slate-700">
              No medicines found
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Try searching for another medicine or brand.
            </p>
          </div>
        )}
      </div>

      {/* Reservation */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <h2 className="text-sm font-extrabold text-slate-700">
          Ready to reserve?
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Reserve available medicines and pick them up at this pharmacy.
        </p>

        <button
          type="button"
          onClick={() => navigate('/reservations')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-800"
        >
          Reserve for pickup
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  )
}

export default PharmacyDetailsPage