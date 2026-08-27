import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

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

        const response = await apiRequest(`/pharmacies/${pharmacyId}`)

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

  const getStatusClasses = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700'

      case 'SUSPENDED':
        return 'bg-amber-50 text-amber-700'

      case 'INACTIVE':
        return 'bg-slate-100 text-slate-500'

      default:
        return 'bg-slate-100 text-slate-500'
    }
  }

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
          Pharmacy
        </p>

        <h1 className="text-2xl font-extrabold leading-tight text-slate-800">
          Pharmacy details
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          View information about this registered pharmacy.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-200" />

              <div className="flex-1">
                <div className="h-5 w-48 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
                <div className="mt-3 h-5 w-20 rounded-full bg-slate-100" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
            </div>
          </div>

          <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-56 rounded bg-slate-200" />
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
            <MapPin size={21} />
          </div>

          <h2 className="mt-3 text-sm font-bold text-red-700">
            Unable to load pharmacy
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-red-600">
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

      {/* Pharmacy Details */}
      {!loading && !error && pharmacy && (
        <div className="space-y-4">
          {/* Main Pharmacy Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Pharmacy Icon */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <MapPin size={25} />
              </div>

              {/* Pharmacy Name */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold leading-tight text-slate-800">
                      {pharmacy.name}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Registered pharmacy
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                      pharmacy.status
                    )}`}
                  >
                    {pharmacy.status || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pharmacy Information */}
            <div className="mt-6 space-y-3">
              {/* Address */}
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <MapPin size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Address
                  </p>

                  <p className="mt-0.5 text-sm font-semibold leading-relaxed text-slate-700">
                    {pharmacy.address || 'No address provided'}
                  </p>
                </div>
              </div>

              {/* Contact Number */}
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <Phone size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Contact number
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {pharmacy.contact_number || 'No contact number provided'}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <Mail size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-0.5 break-all text-sm font-semibold text-slate-700">
                    {pharmacy.email || 'No email provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                <Navigation size={20} />
              </div>

              <h2 className="mt-3 text-sm font-bold text-slate-700">
                Pharmacy location
              </h2>

              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                An interactive map will be connected here later.
              </p>
            </div>
          </div>

          {/* Operating Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Clock3 size={18} />
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-slate-800">
                  Pharmacy information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  More pharmacy details can be added here later.
                </p>
              </div>
            </div>
          </div>

          {/* Future Actions */}
          {pharmacy.status === 'ACTIVE' && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <h2 className="text-sm font-extrabold text-slate-800">
                What would you like to do?
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Medicine availability and reservation features will be
                connected to this pharmacy later.
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white opacity-50"
                >
                  View available medicines
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-bold text-emerald-700 opacity-50"
                >
                  Reserve medicine
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pharmacy Not Found */}
      {!loading && !error && !pharmacy && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <MapPin size={21} />
          </div>

          <h2 className="mt-3 text-sm font-bold text-slate-700">
            Pharmacy not found
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            The pharmacy you are looking for could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate('/pharmacies')}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            Back to pharmacies
          </button>
        </div>
      )}
    </section>
  )
}

export default PharmacyDetailsPage