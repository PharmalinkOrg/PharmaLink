import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Pill,
  ShieldCheck,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api'

function PharmacyDetailsPage() {
  const navigate = useNavigate()
  const { pharmacyId } = useParams()

  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPharmacy = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await apiRequest(
          `/pharmacies/${pharmacyId}`
        )

        setPharmacy(response.data)
      } catch (error) {
        console.error('Failed to load pharmacy:', error)
        setError(
          error.message || 'Unable to load pharmacy information.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (pharmacyId) {
      loadPharmacy()
    }
  }, [pharmacyId])

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <div className="animate-pulse">
          <div className="h-4 w-16 rounded bg-slate-200" />

          <div className="mt-6 h-24 rounded-2xl bg-slate-200" />

          <div className="mt-4 h-5 w-48 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />

          <div className="mt-6 h-32 rounded-2xl bg-slate-200" />
        </div>
      </section>
    )
  }

  if (error || !pharmacy) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() => navigate('/pharmacies')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back to pharmacies
        </button>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
          <h1 className="text-sm font-bold text-red-700">
            Pharmacy not found
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-red-600">
            {error || 'The pharmacy information could not be found.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white"
          >
            Browse pharmacies
          </button>
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

      {/* Pharmacy Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Pill size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Pharmacy
                </p>

                <h1 className="mt-1 text-xl font-extrabold text-slate-800">
                  {pharmacy.name}
                </h1>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
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
          </div>
        </div>

        {/* Address */}
        <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-4">
          <MapPin
            size={18}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-xs font-bold text-slate-700">
              Address
            </p>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {pharmacy.address || 'No address provided'}
            </p>
          </div>
        </div>

        {/* Contact */}
        {pharmacy.contact_number && (
          <div className="mt-4 flex items-center gap-3">
            <Phone
              size={18}
              className="shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-xs font-bold text-slate-700">
                Contact number
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {pharmacy.contact_number}
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        {pharmacy.email && (
          <div className="mt-4 flex items-center gap-3">
            <Mail
              size={18}
              className="shrink-0 text-emerald-600"
            />

            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">
                Email
              </p>

              <p className="mt-1 truncate text-sm text-slate-500">
                {pharmacy.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pharmacy Status */}
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
            <ShieldCheck size={19} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-700">
              {pharmacy.status === 'ACTIVE'
                ? 'Pharmacy is currently active'
                : 'Pharmacy availability'}
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Pharmacy information and medicine availability will
              be connected to the inventory system.
            </p>
          </div>
        </div>
      </div>

      {/* Pharmacy Actions */}
      <div className="mt-6">
        <h2 className="text-sm font-extrabold text-slate-700">
          What would you like to do?
        </h2>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Pill size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700">
                Find medicines
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Search available medicines
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reservations')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Clock3 size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700">
                My reservations
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                View your pickup reservations
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
            <Navigation size={19} />
          </div>

          <h2 className="mt-3 text-sm font-bold text-slate-700">
            Pharmacy location
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            An interactive map will be connected here later.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PharmacyDetailsPage