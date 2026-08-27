import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Pill,
  ShoppingBag,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const pharmacies = [
  {
    id: 1,
    name: 'CebuCare Pharmacy',
    address: 'Mabolo, Cebu City',
    distance: '0.8 km',
    hours: 'Open until 9:00 PM',
  },
  {
    id: 2,
    name: 'SouthMed Pharmacy',
    address: 'Lahug, Cebu City',
    distance: '1.4 km',
    hours: 'Open until 10:00 PM',
  },
  {
    id: 3,
    name: 'HealthPlus Pharmacy',
    address: 'Banilad, Cebu City',
    distance: '2.1 km',
    hours: 'Open until 8:00 PM',
  },
]

function MedicineDetailsPage() {
  const navigate = useNavigate()
  const { medicineId } = useParams()

  const [medicine, setMedicine] = useState(null)
  const [pharmacyAvailability, setPharmacyAvailability] = useState([])
  const [selectedPharmacy, setSelectedPharmacy] = useState(null)

  const [loading, setLoading] = useState(true)
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMedicine = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await apiRequest(`/medicines/${medicineId}`)

        if (!response?.success) {
          throw new Error(
            response?.message || 'Failed to retrieve medicine'
          )
        }

        setMedicine(response.data)
      } catch (error) {
        console.error('Fetch medicine error:', error)

        setError(
          error.message || 'Failed to load medicine information.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (medicineId) {
      fetchMedicine()
    }
  }, [medicineId])

  useEffect(() => {
    const fetchPharmacyAvailability = async () => {
      if (!medicineId) return

      try {
        setAvailabilityLoading(true)

        const results = await Promise.all(
          pharmacies.map(async (pharmacy) => {
            try {
              const response = await apiRequest(
                `/pharmacies/${pharmacy.id}/inventory/public`
              )

              if (!response?.success) {
                return null
              }

              const inventoryItem = (response.data || []).find(
                (item) =>
                  Number(item.medicine_id) === Number(medicineId)
              )

              if (!inventoryItem) {
                return null
              }

              return {
                ...pharmacy,
                stock: inventoryItem.quantity,
                unitPrice: inventoryItem.unit_price,
                inventoryId: inventoryItem.inventory_id,
                status: inventoryItem.status,
              }
            } catch (error) {
              console.error(
                `Failed to load inventory for pharmacy ${pharmacy.id}:`,
                error
              )

              return null
            }
          })
        )

        setPharmacyAvailability(results.filter(Boolean))
      } catch (error) {
        console.error(
          'Fetch pharmacy availability error:',
          error
        )

        setPharmacyAvailability([])
      } finally {
        setAvailabilityLoading(false)
      }
    }

    fetchPharmacyAvailability()
  }, [medicineId])

  const handleReserve = () => {
    if (!selectedPharmacy) return

    navigate('/reservations', {
      state: {
        medicineId: Number(medicineId),
        pharmacyId: selectedPharmacy,
      },
    })
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse">
            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />

              <div className="flex-1">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="mt-3 h-6 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-28 rounded bg-slate-200" />
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-2 h-12 w-full rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error || !medicine) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <h1 className="text-base font-extrabold text-red-700">
            Unable to load medicine
          </h1>

          <p className="mt-2 text-xs text-red-600">
            {error || 'Medicine not found.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  const medicineName =
    medicine.generic_name || 'Unknown medicine'

  const brandName =
    medicine.brand_name || 'Generic'

  const dosage =
    medicine.dosage || 'Dosage not specified'

  const dosageForm =
    medicine.dosage_form || 'Form not specified'

  const prescriptionRequired =
    medicine.requires_prescription === true

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

      {/* Medicine information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Pill size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  Medicine
                </p>

                <h1 className="mt-1 text-xl font-extrabold text-slate-800">
                  {medicineName}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {brandName}
                </p>
              </div>

              {prescriptionRequired ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  Prescription required
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  No prescription
                </span>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-600">
              {dosage} • {dosageForm}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-bold text-slate-700">
            About this medicine
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {medicine.description ||
              'No description is available for this medicine.'}
          </p>
        </div>
      </div>

      {/* Pharmacy availability */}
      <div className="mt-7">
        <div className="mb-3">
          <h2 className="text-base font-extrabold text-slate-800">
            Available nearby
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select a pharmacy to reserve this medicine for pickup.
          </p>
        </div>

        {availabilityLoading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />

                  <div className="flex-1">
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
                    <div className="mt-4 h-3 w-24 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pharmacyAvailability.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <Pill
              size={24}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 text-sm font-bold text-slate-700">
              No nearby pharmacies have this medicine
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              This medicine is currently unavailable for pickup.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pharmacyAvailability.map((pharmacy) => {
              const isSelected =
                selectedPharmacy === pharmacy.id

              const isLimited = pharmacy.stock <= 3

              return (
                <button
                  key={pharmacy.id}
                  type="button"
                  onClick={() =>
                    setSelectedPharmacy(pharmacy.id)
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Pharmacy icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-white text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <MapPin size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-extrabold text-slate-800">
                            {pharmacy.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {pharmacy.address}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-bold text-slate-500">
                          {pharmacy.distance}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span
                          className={`flex items-center gap-1 text-xs font-bold ${
                            isLimited
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {pharmacy.stock} in stock
                        </span>

                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 size={13} />
                          {pharmacy.hours}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span
                          className={`text-xs font-semibold ${
                            isLimited
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isLimited
                            ? 'Limited stock'
                            : 'Ready for pickup'}
                        </span>

                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            Selected
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Reservation action */}
      <div className="mt-6 rounded-2xl bg-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-emerald-200">
            <ShoppingBag size={17} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">
              Reserve for pickup
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Select a pharmacy above, then reserve your medicine
              and pick it up at the pharmacy.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!selectedPharmacy}
          onClick={handleReserve}
          className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selectedPharmacy
            ? 'Continue to reservation'
            : 'Select a pharmacy first'}
        </button>
      </div>
    </section>
  )
}

export default MedicineDetailsPage