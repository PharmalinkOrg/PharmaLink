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
      <section className="medicine-details-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--primary-hover)]"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
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
      <section className="medicine-details-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--primary-hover)]"
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
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)]"
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
    <section className="medicine-details-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--primary-hover)]"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Medicine information */}
      <div className="medicine-detail-card rounded-2xl p-5">
        <div className="flex items-start gap-4">
          {/* Medicine icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)]">
            <Pill size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                {/* Category */}
                <p className="text-xs font-semibold text-[var(--primary)]">
                  Medicine
                </p>

                {/* Generic name */}
                <h1 className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">
                  {medicine.generic_name}
                </h1>

                {/* Brand */}
                {medicine.brand_name && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
                <span className="medicine-prescription-none shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold">
                  No prescription
                </span>
              )}
            </div>

            {/* Dosage */}
            <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
              {medicine.dosage} • {medicine.dosage_form}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-5 border-t border-[var(--border-light)] pt-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            About this medicine
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            {medicine.description ||
              'No additional information is available for this medicine.'}
          </p>
        </div>
      </div>

      {/* Pharmacy availability */}
      <div className="mt-7">
        <div className="mb-3">
          <h2 className="text-base font-extrabold text-[var(--text-primary)]">
            Available nearby
          </h2>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Select a pharmacy to reserve this medicine for
            pickup.
          </p>
        </div>

        {/* Loading pharmacies */}
        {loadingPharmacies ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
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
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary-muted)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Pharmacy icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-[var(--surface)] text-[var(--primary)]'
                          : 'bg-[var(--surface-soft)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <MapPin size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-extrabold text-[var(--text-primary)]">
                            {pharmacy?.name ||
                              'Pharmacy'}
                          </h3>

                          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
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
                              : 'text-[var(--success)]'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {stock} in stock
                        </span>

                        <span className="text-xs font-bold text-[var(--text-secondary)]">
                          ₱
                          {Number(
                            inventory.unit_price || 0
                          ).toFixed(2)}
                        </span>
                      </div>

                      {/* Pharmacy status */}
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                        <span
                          className={`text-xs font-semibold ${
                            isLimited
                              ? 'text-amber-600'
                              : 'text-[var(--success)]'
                          }`}
                        >
                          {isLimited
                            ? 'Limited stock'
                            : 'Ready for pickup'}
                        </span>

                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
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
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--text-muted)]">
              <MapPin size={21} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
              No pharmacies found
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
              This medicine is currently not available at
              any active pharmacy.
            </p>
          </div>
        )}
      </div>

      {/* Reservation action */}
      <div className="medicine-reservation-action mt-6 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] text-white/80">
            <ShoppingBag size={17} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">
              Reserve for pickup
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-white/75">
              Select a pharmacy above, then reserve your
              medicine and pick it up at the pharmacy.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!selectedPharmacy}
          onClick={handleReserve}
          className="mt-4 w-full rounded-xl bg-[var(--primary-light)]0 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
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