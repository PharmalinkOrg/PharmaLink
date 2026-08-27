import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Pill,
  ShoppingBag,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function MedicineDetailsPage() {
  const navigate = useNavigate()
  const { medicineId } = useParams()

  const [medicine, setMedicine] = useState(null)
  const [pharmacies, setPharmacies] = useState([])
  const [selectedPharmacy, setSelectedPharmacy] = useState(null)

  const [loadingMedicine, setLoadingMedicine] = useState(true)
  const [loadingPharmacies, setLoadingPharmacies] = useState(true)
  const [error, setError] = useState('')

  /*
   * Load medicine information
   */
  useEffect(() => {
    const loadMedicine = async () => {
      try {
        setLoadingMedicine(true)
        setError('')

        const response = await apiRequest(
          `/medicines/${medicineId}`
        )

        if (!response.success || !response.data) {
          throw new Error(
            'Medicine information could not be loaded.'
          )
        }

        setMedicine(response.data)
      } catch (error) {
        console.error('Load medicine error:', error)

        setError(
          error.message || 'Failed to load medicine.'
        )
      } finally {
        setLoadingMedicine(false)
      }
    }

    if (medicineId) {
      loadMedicine()
    }
  }, [medicineId])

  /*
   * Load pharmacies where this medicine is available
   */
  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        setLoadingPharmacies(true)

        const response = await apiRequest(
          `/pharmacies/medicine/${medicineId}/pharmacies`
        )

        if (!response.success) {
          throw new Error(
            'Pharmacy availability could not be loaded.'
          )
        }

        setPharmacies(response.data || [])
      } catch (error) {
        console.error(
          'Load pharmacy availability error:',
          error
        )

        setError(
          error.message ||
            'Failed to load pharmacy availability.'
        )
      } finally {
        setLoadingPharmacies(false)
      }
    }

    if (medicineId) {
      loadPharmacies()
    }
  }, [medicineId])

  /*
   * Continue to reservation page
   */
  const handleReserve = () => {
    if (!selectedPharmacy || !medicine) {
      return
    }

    const selectedInventory = pharmacies.find(
      (inventory) =>
        Number(inventory.pharmacy_id) ===
        Number(selectedPharmacy)
    )

    if (!selectedInventory) {
      return
    }

    navigate('/reservations', {
      state: {
        medicine: {
          medicine_id: medicine.medicine_id,
          generic_name: medicine.generic_name,
          brand_name: medicine.brand_name,
          dosage: medicine.dosage,
          dosage_form: medicine.dosage_form,
          requires_prescription:
            medicine.requires_prescription,
        },

        pharmacy: {
          pharmacy_id: selectedInventory.pharmacy_id,
          name:
            selectedInventory.pharmacies?.name ||
            'Pharmacy',
          address:
            selectedInventory.pharmacies?.address ||
            'Address unavailable',
        },

        inventory: {
          inventory_id: selectedInventory.inventory_id,
          quantity: selectedInventory.quantity,
          unit_price: selectedInventory.unit_price,
        },
      },
    })
  }

  /*
   * Loading state
   */
  if (loadingMedicine) {
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Loading medicine...
          </p>
        </div>
      </section>
    )
  }

  /*
   * Error / medicine not found
   */
  if (error && !medicine) {
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

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-base font-extrabold text-red-700">
            Unable to load medicine
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  const prescriptionRequired =
    medicine?.requires_prescription === true

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
          {/* Medicine icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Pill size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                {/* Category */}
                <p className="text-xs font-semibold text-emerald-700">
                  Medicine
                </p>

                {/* Generic name */}
                <h1 className="mt-1 text-xl font-extrabold text-slate-800">
                  {medicine.generic_name}
                </h1>

                {/* Brand */}
                {medicine.brand_name && (
                  <p className="mt-1 text-sm text-slate-500">
                    {medicine.brand_name}
                  </p>
                )}
              </div>

              {/* Prescription status */}
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

            {/* Dosage */}
            <p className="mt-3 text-sm font-semibold text-slate-600">
              {medicine.dosage} • {medicine.dosage_form}
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
              'No additional information is available for this medicine.'}
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
            Select a pharmacy to reserve this medicine for
            pickup.
          </p>
        </div>

        {/* Loading pharmacies */}
        {loadingPharmacies ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Checking pharmacy availability...
            </p>
          </div>
        ) : pharmacies.length > 0 ? (
          <div className="space-y-3">
            {pharmacies.map((inventory) => {
              const pharmacy = inventory.pharmacies

              const isSelected =
                Number(selectedPharmacy) ===
                Number(inventory.pharmacy_id)

              const stock =
                Number(inventory.quantity) || 0

              const isLimited = stock <= 3

              return (
                <button
                  key={inventory.inventory_id}
                  type="button"
                  onClick={() =>
                    setSelectedPharmacy(
                      inventory.pharmacy_id
                    )
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
                            {pharmacy?.name ||
                              'Pharmacy'}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {pharmacy?.address ||
                              'Address unavailable'}
                          </p>
                        </div>
                      </div>

                      {/* Stock and price */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span
                          className={`flex items-center gap-1 text-xs font-bold ${
                            isLimited
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {stock} in stock
                        </span>

                        <span className="text-xs font-bold text-slate-600">
                          ₱
                          {Number(
                            inventory.unit_price || 0
                          ).toFixed(2)}
                        </span>
                      </div>

                      {/* Pharmacy status */}
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
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <MapPin size={21} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-700">
              No pharmacies found
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              This medicine is currently not available at
              any active pharmacy.
            </p>
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
              Select a pharmacy above, then reserve your
              medicine and pick it up at the pharmacy.
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
