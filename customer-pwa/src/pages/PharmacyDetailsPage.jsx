import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Pill,
  AlertCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function PharmacyDetailsPage() {
  const navigate = useNavigate()
  const { pharmacyId } = useParams()

  const [pharmacy, setPharmacy] = useState(null)
  const [medicines, setMedicines] = useState([])

  const [loading, setLoading] = useState(true)
  const [medicinesLoading, setMedicinesLoading] = useState(true)

  const [error, setError] = useState('')
  const [medicinesError, setMedicinesError] = useState('')

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

    const loadMedicines = async () => {
      try {
        setMedicinesLoading(true)
        setMedicinesError('')

        const response = await apiRequest(
          `/pharmacies/${pharmacyId}/inventory/public`
        )

        setMedicines(response.data || [])
      } catch (error) {
        console.error('Failed to load pharmacy medicines:', error)

        setMedicinesError(
          error.message || 'Unable to load pharmacy medicines.'
        )
      } finally {
        setMedicinesLoading(false)
      }
    }

    if (pharmacyId) {
      loadPharmacy()
      loadMedicines()
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

  const getInventoryStatusClasses = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700'

      case 'LOW_STOCK':
        return 'bg-amber-50 text-amber-700'

      case 'OUT_OF_STOCK':
        return 'bg-red-50 text-red-700'

      default:
        return 'bg-slate-100 text-slate-500'
    }
  }

  const formatInventoryStatus = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available'

      case 'LOW_STOCK':
        return 'Low stock'

      case 'OUT_OF_STOCK':
        return 'Out of stock'

      default:
        return status || 'Unknown'
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
          View pharmacy information and available medicines.
        </p>
      </div>

      {/* Pharmacy Loading */}
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
        </div>
      )}

      {/* Pharmacy Error */}
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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <MapPin size={25} />
              </div>

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
                    {pharmacy.contact_number ||
                      'No contact number provided'}
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

          {/* Available Medicines */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Pill size={19} />
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-slate-800">
                  Available medicines
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Medicines currently available at this pharmacy.
                </p>
              </div>
            </div>

            {/* Medicine Loading */}
            {medicinesLoading && (
              <div className="mt-5 space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200" />

                      <div className="flex-1">
                        <div className="h-4 w-40 rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
                        <div className="mt-3 h-3 w-20 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Medicine Error */}
            {!medicinesLoading && medicinesError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="text-xs font-bold text-red-700">
                      Unable to load medicines
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-red-600">
                      {medicinesError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medicine List */}
            {!medicinesLoading &&
              !medicinesError &&
              medicines.length > 0 && (
                <div className="mt-5 space-y-3">
                  {medicines.map((item) => {
                    const medicine = item.medicine

                    return (
                      <div
                        key={item.inventory_id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Pill size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-sm font-extrabold text-slate-800">
                                  {medicine?.generic_name ||
                                    'Unknown medicine'}
                                </h3>

                                {medicine?.brand_name && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {medicine.brand_name}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${getInventoryStatusClasses(
                                  item.status
                                )}`}
                              >
                                {formatInventoryStatus(item.status)}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-slate-50 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Dosage
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                  {medicine?.dosage || 'Not specified'}
                                </p>
                              </div>

                              <div className="rounded-lg bg-slate-50 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Form
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                  {medicine?.dosage_form ||
                                    'Not specified'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Price
                                </p>

                                <p className="mt-0.5 text-sm font-extrabold text-emerald-700">
                                  ₱{Number(item.unit_price).toFixed(2)}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Stock
                                </p>

                                <p className="mt-0.5 text-xs font-bold text-slate-700">
                                  {item.quantity} available
                                </p>
                              </div>
                            </div>

                            {medicine?.requires_prescription && (
                              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
                                <p className="text-[10px] font-bold text-amber-700">
                                  Prescription required
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            {/* No Medicines */}
            {!medicinesLoading &&
              !medicinesError &&
              medicines.length === 0 && (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                    <Pill size={19} />
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-700">
                    No medicines available
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    This pharmacy currently has no medicines available
                    for viewing.
                  </p>
                </div>
              )}
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

          {/* Pharmacy Information */}
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
                Reservation features will be connected here in the
                next step.
              </p>

              <div className="mt-4">
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white opacity-50"
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