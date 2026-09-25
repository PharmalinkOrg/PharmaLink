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
  const [offerings, setOfferings] = useState([])
  const [pharmacyCount, setPharmacyCount] = useState(0)

  const [selectedOffering, setSelectedOffering] =
    useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* ==========================================================
     LOAD MEDICINE + EQUIVALENT PHARMACY OFFERINGS
  ========================================================== */

  useEffect(() => {
    const loadMedicineAvailability = async () => {
      try {
        setLoading(true)
        setError('')
        setSelectedOffering(null)

        const response = await apiRequest(
          `/pharmacies/medicine/${medicineId}/pharmacies`
        )

        if (!response.success || !response.data) {
          throw new Error(
            response.message ||
              'Medicine information could not be loaded.'
          )
        }

        const data = response.data

        if (!data.medicine) {
          throw new Error(
            'Medicine information could not be loaded.'
          )
        }

        setMedicine(data.medicine)
        setOfferings(data.offerings || [])
        setPharmacyCount(
          Number(data.pharmacy_count) || 0
        )
      } catch (error) {
        console.error(
          'Load medicine availability error:',
          error
        )

        setError(
          error.message ||
            'Failed to load medicine availability.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (medicineId) {
      loadMedicineAvailability()
    }
  }, [medicineId])

  /* ==========================================================
     SELECT PHARMACY
  ========================================================== */

  const handleSelectOffering = (offering) => {
    setSelectedOffering(offering)
  }

  /* ==========================================================
     CONTINUE TO RESERVATION
  ========================================================== */

  const handleReserve = () => {
    if (!selectedOffering || !medicine) {
      return
    }

    /*
     * IMPORTANT:
     *
     * medicine.medicine_id is only the representative medicine
     * used to open this page.
     *
     * selectedOffering.medicine_id is the actual medicine
     * record owned by the pharmacy selected by the customer.
     *
     * The reservation must use the pharmacy-owned medicine ID.
     */
    navigate('/reservations', {
      state: {
        medicine: {
          medicine_id:
            selectedOffering.medicine_id,

          generic_name:
            medicine.generic_name,

          brand_name:
            medicine.brand_name,

          dosage:
            medicine.dosage,

          dosage_form:
            medicine.dosage_form,

          requires_prescription:
            medicine.requires_prescription,
        },

        pharmacy: {
          pharmacy_id:
            selectedOffering.pharmacy_id,

          name:
            selectedOffering.pharmacy?.name ||
            'Pharmacy',

          address:
            selectedOffering.pharmacy?.address ||
            'Address unavailable',
        },

        /*
         * ReservationsPage currently expects inventory-like
         * information for stock/price display.
         *
         * The backend reservation creation remains authoritative
         * for actual stock validation.
         */
        inventory: {
          inventory_id:
            selectedOffering.batches?.[0]
              ?.inventory_id || null,

          quantity:
            selectedOffering.quantity,

          unit_price:
            selectedOffering.lowest_price,
        },
      },
    })
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
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
            Loading medicine availability...
          </p>
        </div>
      </section>
    )
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error || !medicine) {
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
            {error ||
              'Medicine information could not be loaded.'}
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
    medicine.requires_prescription === true

  /* ==========================================================
     PAGE
  ========================================================== */

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

      {/* ======================================================
          MEDICINE INFORMATION
      ====================================================== */}

      <div className="medicine-detail-card rounded-2xl p-5">
        <div className="flex items-start gap-4">
          {/* Medicine icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)]">
            <Pill size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--primary)]">
                  Medicine
                </p>

                <h1 className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">
                  {medicine.generic_name}
                </h1>

                {medicine.brand_name && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {medicine.brand_name}
                  </p>
                )}
              </div>

              {/* Prescription */}
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

            <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
              {medicine.dosage || 'Dosage not specified'}

              {medicine.dosage_form &&
                ` • ${medicine.dosage_form}`}
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

      {/* ======================================================
          PHARMACY AVAILABILITY
      ====================================================== */}

      <div className="mt-7">
        <div className="mb-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
              Available at pharmacies
            </h2>

            {pharmacyCount > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {pharmacyCount}{' '}
                {pharmacyCount === 1
                  ? 'pharmacy'
                  : 'pharmacies'}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Select a pharmacy to reserve this medicine
            for pickup.
          </p>
        </div>

        {offerings.length > 0 ? (
          <div className="space-y-3">
            {offerings.map((offering) => {
              const pharmacy = offering.pharmacy

              const isSelected =
                Number(
                  selectedOffering?.pharmacy_id
                ) ===
                  Number(offering.pharmacy_id) &&
                Number(
                  selectedOffering?.medicine_id
                ) ===
                  Number(offering.medicine_id)

              const stock =
                Number(offering.quantity) || 0

              const price =
                Number(offering.lowest_price)

              const hasPrice =
                Number.isFinite(price)

              const isLimited =
                stock <= 3

              return (
                <button
                  key={`${offering.pharmacy_id}-${offering.medicine_id}`}
                  type="button"
                  onClick={() =>
                    handleSelectOffering(offering)
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
                          <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                            {pharmacy?.name ||
                              'Pharmacy'}
                          </h3>

                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {pharmacy?.address ||
                              'Address unavailable'}
                          </p>
                        </div>
                      </div>

                      {/* Stock + price */}
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
                          {hasPrice
                            ? `₱${price.toFixed(2)}`
                            : 'Price unavailable'}
                        </span>
                      </div>

                      {/* Availability */}
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
              This medicine is currently not available
              at any active pharmacy.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          RESERVATION ACTION
      ====================================================== */}

      {offerings.length > 0 && (
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
                Select a pharmacy above, then reserve
                your medicine and pick it up at the
                pharmacy.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedOffering}
            onClick={handleReserve}
            className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedOffering
              ? 'Continue to reservation'
              : 'Select a pharmacy first'}
          </button>
        </div>
      )}
    </section>
  )
}

export default MedicineDetailsPage