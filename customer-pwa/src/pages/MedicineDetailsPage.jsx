import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  LocateFixed,
  MapPin,
  Navigation,
  Pill,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

/* ==========================================================
   LOCATION HELPERS
========================================================== */

const toRadians = (degrees) => {
  return (degrees * Math.PI) / 180
}

/**
 * Validate coordinates without accidentally converting
 * null / undefined / '' into 0.
 */
const getValidCoordinates = (latitude, longitude) => {
  const hasLatitude =
    latitude !== undefined &&
    latitude !== null &&
    latitude !== ''

  const hasLongitude =
    longitude !== undefined &&
    longitude !== null &&
    longitude !== ''

  if (!hasLatitude || !hasLongitude) {
    return null
  }

  const normalizedLatitude = Number(latitude)
  const normalizedLongitude = Number(longitude)

  if (
    !Number.isFinite(normalizedLatitude) ||
    !Number.isFinite(normalizedLongitude)
  ) {
    return null
  }

  if (
    normalizedLatitude < -90 ||
    normalizedLatitude > 90
  ) {
    return null
  }

  if (
    normalizedLongitude < -180 ||
    normalizedLongitude > 180
  ) {
    return null
  }

  return {
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  }
}

/**
 * Calculate straight-line distance between two coordinates
 * using the Haversine formula.
 *
 * Returns distance in kilometers.
 */
const calculateDistanceKm = (
  customerLatitude,
  customerLongitude,
  pharmacyLatitude,
  pharmacyLongitude
) => {
  const earthRadiusKm = 6371

  const latitudeDifference = toRadians(
    pharmacyLatitude - customerLatitude
  )

  const longitudeDifference = toRadians(
    pharmacyLongitude - customerLongitude
  )

  const customerLatitudeRadians =
    toRadians(customerLatitude)

  const pharmacyLatitudeRadians =
    toRadians(pharmacyLatitude)

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(customerLatitudeRadians) *
      Math.cos(pharmacyLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )

  return earthRadiusKm * c
}

/**
 * Format distance for customer display.
 */
const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) {
    return 'Distance unavailable'
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)

    return `${meters} m away`
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`
  }

  return `${Math.round(distanceKm)} km away`
}

/* ==========================================================
   COMPONENT
========================================================== */

function MedicineDetailsPage() {
  const navigate = useNavigate()
  const { medicineId } = useParams()

  /* ========================================================
     MEDICINE / PHARMACY STATE
  ======================================================== */

  const [medicine, setMedicine] = useState(null)
  const [offerings, setOfferings] = useState([])
  const [pharmacyCount, setPharmacyCount] = useState(0)

  const [selectedOffering, setSelectedOffering] =
    useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* ========================================================
     CUSTOMER LOCATION STATE
  ======================================================== */

  const [customerLocation, setCustomerLocation] =
    useState(null)

  const [locationStatus, setLocationStatus] =
    useState('idle')

  const [locationMessage, setLocationMessage] =
    useState('')

  /*
   * locationStatus values:
   *
   * idle
   * requesting
   * available
   * denied
   * unavailable
   * unsupported
   */

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

        setOfferings(
          Array.isArray(data.offerings)
            ? data.offerings
            : []
        )

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
     REQUEST CUSTOMER LOCATION
  ========================================================== */

  const requestCustomerLocation = () => {
    if (!navigator.geolocation) {
      setCustomerLocation(null)
      setLocationStatus('unsupported')

      setLocationMessage(
        'Location services are not supported by this browser.'
      )

      return
    }

    setLocationStatus('requesting')
    setLocationMessage('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude

        const longitude =
          position.coords.longitude

        const coordinates =
          getValidCoordinates(
            latitude,
            longitude
          )

        if (!coordinates) {
          setCustomerLocation(null)
          setLocationStatus('unavailable')

          setLocationMessage(
            'Your location could not be determined.'
          )

          return
        }

        setCustomerLocation({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy:
            Number(position.coords.accuracy) || null,
        })

        setLocationStatus('available')
        setLocationMessage('')
      },

      (locationError) => {
        console.warn(
          'Customer geolocation error:',
          locationError
        )

        setCustomerLocation(null)

        switch (locationError.code) {
          case 1:
            setLocationStatus('denied')

            setLocationMessage(
              'Location access was denied. You can still select a pharmacy, but distance cannot be calculated.'
            )

            break

          case 2:
            setLocationStatus('unavailable')

            setLocationMessage(
              'Your current location is unavailable. You can still select a pharmacy.'
            )

            break

          case 3:
            setLocationStatus('unavailable')

            setLocationMessage(
              'Getting your location took too long. You can try again.'
            )

            break

          default:
            setLocationStatus('unavailable')

            setLocationMessage(
              'Your location could not be determined.'
            )
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }

  /* ==========================================================
     REQUEST LOCATION AFTER PHARMACIES LOAD
  ========================================================== */

  useEffect(() => {
    if (
      loading ||
      offerings.length === 0 ||
      locationStatus !== 'idle'
    ) {
      return
    }

    requestCustomerLocation()
  }, [loading, offerings.length, locationStatus])

  /* ==========================================================
     ADD DISTANCE TO PHARMACY OFFERINGS
  ========================================================== */

  const offeringsWithDistance = useMemo(() => {
    return offerings.map((offering) => {
      const pharmacy = offering.pharmacy

      const pharmacyCoordinates =
        getValidCoordinates(
          pharmacy?.latitude,
          pharmacy?.longitude
        )

      let distanceKm = null

      if (
        customerLocation &&
        pharmacyCoordinates
      ) {
        const calculatedDistance =
          calculateDistanceKm(
            customerLocation.latitude,
            customerLocation.longitude,
            pharmacyCoordinates.latitude,
            pharmacyCoordinates.longitude
          )

        if (
          Number.isFinite(calculatedDistance)
        ) {
          distanceKm = calculatedDistance
        }
      }

      return {
        ...offering,
        distance_km: distanceKm,
        has_location:
          pharmacyCoordinates !== null,
      }
    })
  }, [offerings, customerLocation])

  /* ==========================================================
     SORT PHARMACIES
  ========================================================== */

  const sortedOfferings = useMemo(() => {
    const sorted = [...offeringsWithDistance]

    /*
     * If customer location is unavailable, preserve the
     * backend ordering.
     */
    if (!customerLocation) {
      return sorted
    }

    return sorted.sort((a, b) => {
      const aHasDistance =
        Number.isFinite(a.distance_km)

      const bHasDistance =
        Number.isFinite(b.distance_km)

      /*
       * Both pharmacies have distance:
       * nearest first.
       */
      if (aHasDistance && bHasDistance) {
        return a.distance_km - b.distance_km
      }

      /*
       * Pharmacy A has distance but B does not.
       * A should appear first.
       */
      if (aHasDistance && !bHasDistance) {
        return -1
      }

      /*
       * Pharmacy B has distance but A does not.
       * B should appear first.
       */
      if (!aHasDistance && bHasDistance) {
        return 1
      }

      /*
       * Neither has distance.
       * Preserve backend ordering.
       */
      return 0
    })
  }, [
    offeringsWithDistance,
    customerLocation,
  ])

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
     * medicine.medicine_id is the representative medicine
     * used to open this page.
     *
     * selectedOffering.medicine_id is the actual medicine
     * record belonging to the selected pharmacy.
     *
     * The reservation must use the pharmacy-owned
     * medicine ID.
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
         * information for stock and price display.
         *
         * Backend reservation creation remains authoritative
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
            onClick={() =>
              window.location.reload()
            }
            className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)]"
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  const prescriptionRequired =
    medicine.requires_prescription === true

  const hasCalculatedDistances =
    sortedOfferings.some((offering) =>
      Number.isFinite(offering.distance_km)
    )

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <section className="medicine-details-page mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
      {/* ======================================================
          BACK
      ====================================================== */}

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
              {medicine.dosage ||
                'Dosage not specified'}

              {medicine.dosage_form &&
                ` • ${medicine.dosage_form}`}
            </p>
          </div>
        </div>

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
          PHARMACY AVAILABILITY HEADER
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
            {hasCalculatedDistances
              ? 'Partner pharmacies are ordered by distance from your current location.'
              : 'Select a pharmacy to reserve this medicine for pickup.'}
          </p>
        </div>

        {/* ====================================================
            LOCATION STATUS
        ==================================================== */}

        {offerings.length > 0 && (
          <div className="mb-4">
            {locationStatus ===
              'requesting' && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                <LocateFixed
                  size={18}
                  className="medicine-location-loading-icon mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Getting your location...
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    PharmaLink uses your current
                    location to show the nearest
                    partner pharmacies.
                  </p>
                </div>
              </div>
            )}

            {locationStatus ===
              'available' && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3">
                <Navigation
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--success)]"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--success)]">
                    Location available
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    Pharmacies with confirmed
                    locations are sorted from
                    nearest to farthest.
                  </p>
                </div>
              </div>
            )}

            {(locationStatus === 'denied' ||
              locationStatus ===
                'unavailable' ||
              locationStatus ===
                'unsupported') && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Distance unavailable
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {locationMessage}
                  </p>

                  {locationStatus !==
                    'unsupported' && (
                    <button
                      type="button"
                      onClick={
                        requestCustomerLocation
                      }
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)]"
                    >
                      <RefreshCw size={12} />
                      Try location again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            PHARMACY CARDS
        ==================================================== */}

        {sortedOfferings.length > 0 ? (
          <div className="space-y-3">
            {sortedOfferings.map(
              (offering, index) => {
                const pharmacy =
                  offering.pharmacy

                const isSelected =
                  Number(
                    selectedOffering?.pharmacy_id
                  ) ===
                    Number(
                      offering.pharmacy_id
                    ) &&
                  Number(
                    selectedOffering?.medicine_id
                  ) ===
                    Number(
                      offering.medicine_id
                    )

                const stock =
                  Number(offering.quantity) || 0

                const price = Number(
                  offering.lowest_price
                )

                const hasPrice =
                  Number.isFinite(price)

                const isLimited =
                  stock > 0 && stock <= 3

                const hasDistance =
                  Number.isFinite(
                    offering.distance_km
                  )

                const isNearest =
                  hasCalculatedDistances &&
                  hasDistance &&
                  index === 0

                return (
                  <button
                    key={`${offering.pharmacy_id}-${offering.medicine_id}`}
                    type="button"
                    onClick={() =>
                      handleSelectOffering(
                        offering
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
                        {/* Pharmacy name */}

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                                {pharmacy?.name ||
                                  'Pharmacy'}
                              </h3>

                              {isNearest && (
                                <span className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                  Nearest
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                              {pharmacy?.address ||
                                'Address unavailable'}
                            </p>
                          </div>
                        </div>

                        {/* Distance */}

                        <div className="mt-2 flex items-center gap-1.5">
                          <Navigation
                            size={13}
                            className={
                              hasDistance
                                ? 'text-[var(--primary)]'
                                : 'text-[var(--text-muted)]'
                            }
                          />

                          <span
                            className={`text-[11px] font-bold ${
                              hasDistance
                                ? 'text-[var(--primary)]'
                                : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {hasDistance
                              ? formatDistance(
                                  offering.distance_km
                                )
                              : locationStatus ===
                                  'requesting'
                                ? 'Calculating distance...'
                                : offering.has_location
                                  ? 'Distance unavailable'
                                  : 'Pharmacy location unavailable'}
                          </span>
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
                            <CheckCircle2
                              size={13}
                            />

                            {stock} in stock
                          </span>

                          <span className="text-xs font-bold text-[var(--text-secondary)]">
                            {hasPrice
                              ? `₱${price.toFixed(
                                  2
                                )}`
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

                              <CheckCircle2
                                size={14}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              }
            )}
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
              This medicine is currently not
              available at any active partner
              pharmacy.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          RESERVATION ACTION
      ====================================================== */}

      {sortedOfferings.length > 0 && (
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
                Select a pharmacy above, then
                reserve your medicine and pick it
                up at the pharmacy.
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