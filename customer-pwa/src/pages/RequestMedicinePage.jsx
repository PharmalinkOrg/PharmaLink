// File: customer-pwa/src/pages/RequestMedicinePage.jsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Pill,
  Search,
  Send,
  Store,
  X,
} from 'lucide-react'

import { useAuth } from '../components/auth/useAuth'
import { api } from '../lib/api'

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getMedicineKey(medicine) {
  if (medicine?.medicine_key) {
    return medicine.medicine_key
  }

  return [
    normalizeText(medicine?.generic_name),
    normalizeText(medicine?.brand_name),
    normalizeText(medicine?.dosage),
    normalizeText(medicine?.dosage_form),
    medicine?.requires_prescription ? 'rx' : 'otc',
  ].join('|')
}

function getMedicineName(medicine) {
  if (!medicine) {
    return 'Unknown medicine'
  }

  const genericName =
    medicine.generic_name?.trim() || ''

  const brandName =
    medicine.brand_name?.trim() || ''

  if (brandName && genericName) {
    return `${brandName} (${genericName})`
  }

  return (
    brandName ||
    genericName ||
    'Unnamed medicine'
  )
}

function getMedicineMeta(medicine) {
  if (!medicine) {
    return ''
  }

  return [
    medicine.dosage,
    medicine.dosage_form,
  ]
    .filter(Boolean)
    .join(' • ')
}

function getPharmacyId(pharmacy) {
  const value =
    pharmacy?.pharmacy_id ??
    pharmacy?.id

  const number = Number(value)

  return Number.isInteger(number) && number > 0
    ? number
    : null
}

function getMedicineId(medicine) {
  const value =
    medicine?.medicine_id ??
    medicine?.id

  const number = Number(value)

  return Number.isInteger(number) && number > 0
    ? number
    : null
}

function getOfferingPharmacyId(offering) {
  return getPharmacyId(
    offering?.pharmacy || {
      pharmacy_id: offering?.pharmacy_id,
    },
  )
}

function getOfferingMedicineId(offering) {
  return getMedicineId(offering)
}

function isOutOfStockOffering(offering) {
  const quantity = Number(offering?.quantity)

  return (
    Number.isFinite(quantity) &&
    quantity <= 0
  )
}

function buildMedicineGroups(rawMedicines) {
  const groups = new Map()

  for (const entry of rawMedicines || []) {
    const key = getMedicineKey(entry)

    if (!groups.has(key)) {
      groups.set(key, {
        medicine_key: key,
        generic_name:
          entry.generic_name || '',
        brand_name:
          entry.brand_name || '',
        dosage:
          entry.dosage || '',
        dosage_form:
          entry.dosage_form || '',
        requires_prescription:
          Boolean(entry.requires_prescription),
        offerings: [],
      })
    }

    const group = groups.get(key)

    // Some endpoints may already return grouped offerings.
    if (Array.isArray(entry.offerings)) {
      for (const offering of entry.offerings) {
        group.offerings.push({
          ...offering,
          generic_name:
            offering.generic_name ??
            entry.generic_name,
          brand_name:
            offering.brand_name ??
            entry.brand_name,
          dosage:
            offering.dosage ??
            entry.dosage,
          dosage_form:
            offering.dosage_form ??
            entry.dosage_form,
          requires_prescription:
            offering.requires_prescription ??
            entry.requires_prescription,
        })
      }

      continue
    }

    // Otherwise treat the returned row itself as an offering.
    group.offerings.push(entry)
  }

  return Array.from(groups.values())
}

function pharmacyMatchesOffering(
  offering,
  pharmacyId,
) {
  return (
    getOfferingPharmacyId(offering) ===
    Number(pharmacyId)
  )
}

// ============================================================
// COMPONENT
// ============================================================

function RequestMedicinePage() {
  const navigate = useNavigate()

  const {
    user,
    loading: authLoading,
  } = useAuth()

  const [rawMedicines, setRawMedicines] =
    useState([])

  const [pharmacies, setPharmacies] =
    useState([])

  const [medicineQuery, setMedicineQuery] =
    useState('')

  const [
    selectedMedicine,
    setSelectedMedicine,
  ] = useState(null)

  const [
    selectedPharmacyId,
    setSelectedPharmacyId,
  ] = useState('')

  const [quantity, setQuantity] =
    useState(1)

  const [notes, setNotes] =
    useState('')

  const [
    showMedicineSuggestions,
    setShowMedicineSuggestions,
  ] = useState(false)

  const [loadingData, setLoadingData] =
    useState(true)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  // ==========================================================
  // AUTH
  // ==========================================================

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', {
        state: {
          from: '/request-medicine',
        },
      })
    }
  }, [
    authLoading,
    user,
    navigate,
  ])

  // ==========================================================
  // LOAD MEDICINES + PARTNER PHARMACIES
  // ==========================================================

  useEffect(() => {
    let isCurrent = true

    async function loadData() {
      try {
        setLoadingData(true)
        setError('')

        const [
          medicinesData,
          pharmaciesData,
        ] = await Promise.all([
          api.getAvailableMedicines(),
          api.getPharmacies(),
        ])

        if (!isCurrent) {
          return
        }

        setRawMedicines(
          Array.isArray(medicinesData)
            ? medicinesData
            : [],
        )

        setPharmacies(
          Array.isArray(pharmaciesData)
            ? pharmaciesData
            : [],
        )
      } catch (loadError) {
        console.error(
          'Failed to load medicine request data:',
          loadError,
        )

        if (isCurrent) {
          setError(
            loadError.message ||
              'Unable to load medicines and pharmacies.',
          )
        }
      } finally {
        if (isCurrent) {
          setLoadingData(false)
        }
      }
    }

    if (!authLoading && user) {
      loadData()
    }

    return () => {
      isCurrent = false
    }
  }, [
    authLoading,
    user,
  ])

  // ==========================================================
  // GROUP EQUIVALENT MEDICINES
  // ==========================================================

  const medicineGroups = useMemo(
    () => buildMedicineGroups(rawMedicines),
    [rawMedicines],
  )

  // ==========================================================
  // SEARCH RESULTS
  // ==========================================================

  const filteredMedicines = useMemo(() => {
    const query =
      normalizeText(medicineQuery)

    if (!query) {
      return []
    }

    return medicineGroups
      .filter((medicine) => {
        const searchable = normalizeText(
          [
            medicine.generic_name,
            medicine.brand_name,
            medicine.dosage,
            medicine.dosage_form,
          ]
            .filter(Boolean)
            .join(' '),
        )

        return searchable.includes(query)
      })
      .slice(0, 10)
  }, [
    medicineGroups,
    medicineQuery,
  ])

  // ==========================================================
  // ACTIVE PARTNER PHARMACIES
  // ==========================================================

  const activePharmacies = useMemo(
    () =>
      pharmacies.filter(
        (pharmacy) =>
          pharmacy.status === 'ACTIVE',
      ),
    [pharmacies],
  )

  // ==========================================================
  // SELECTED PHARMACY
  // ==========================================================

  const selectedPharmacy = useMemo(
    () =>
      activePharmacies.find(
        (pharmacy) =>
          getPharmacyId(pharmacy) ===
          Number(selectedPharmacyId),
      ) || null,
    [
      activePharmacies,
      selectedPharmacyId,
    ],
  )

  // ==========================================================
  // FIND THE CORRECT PHARMACY-OWNED MEDICINE ID
  // ==========================================================

  const selectedOffering = useMemo(() => {
    if (
      !selectedMedicine ||
      !selectedPharmacyId
    ) {
      return null
    }

    return (
      selectedMedicine.offerings.find(
        (offering) =>
          pharmacyMatchesOffering(
            offering,
            selectedPharmacyId,
          ),
      ) || null
    )
  }, [
    selectedMedicine,
    selectedPharmacyId,
  ])

  // ==========================================================
  // PHARMACY AVAILABILITY INFORMATION
  // ==========================================================

  const selectedOfferingIsOutOfStock =
    selectedOffering
      ? isOutOfStockOffering(
          selectedOffering,
        )
      : false

  // ==========================================================
  // MEDICINE SEARCH
  // ==========================================================

  function handleMedicineSearch(value) {
    setMedicineQuery(value)

    setSelectedMedicine(null)
    setSelectedPharmacyId('')
    setSuccessMessage('')
    setError('')

    setShowMedicineSuggestions(
      value.trim().length > 0,
    )
  }

  function handleSelectMedicine(medicine) {
    setSelectedMedicine(medicine)

    setMedicineQuery(
      getMedicineName(medicine),
    )

    setSelectedPharmacyId('')
    setShowMedicineSuggestions(false)
    setError('')
    setSuccessMessage('')
  }

  function clearSelectedMedicine() {
    setSelectedMedicine(null)
    setMedicineQuery('')
    setSelectedPharmacyId('')
    setShowMedicineSuggestions(false)
    setError('')
    setSuccessMessage('')
  }

  // ==========================================================
  // RESET
  // ==========================================================

  function resetForm() {
    setMedicineQuery('')
    setSelectedMedicine(null)
    setSelectedPharmacyId('')
    setQuantity(1)
    setNotes('')
    setShowMedicineSuggestions(false)
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccessMessage('')

    if (!selectedMedicine) {
      setError(
        'Please select an existing medicine from the search results.',
      )
      return
    }

    if (!selectedPharmacyId) {
      setError(
        'Please select the partner pharmacy you want to send this request to.',
      )
      return
    }

    const parsedQuantity =
      Number(quantity)

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        'Requested quantity must be a whole number greater than zero.',
      )
      return
    }

    if (!selectedOffering) {
      setError(
        'This medicine does not have a matching record for the selected pharmacy.',
      )
      return
    }

    const medicineId =
      getOfferingMedicineId(
        selectedOffering,
      )

    if (!medicineId) {
      setError(
        'The selected medicine could not be identified. Please select the medicine again.',
      )
      return
    }

    /*
     * Medicine Requests are intended for medicine that is
     * unavailable / out of stock at the selected pharmacy.
     *
     * If quantity information is present and stock is greater
     * than zero, direct the customer back to normal reservation.
     */
    const offeringQuantity =
      Number(selectedOffering.quantity)

    if (
      Number.isFinite(offeringQuantity) &&
      offeringQuantity > 0
    ) {
      setError(
        'This medicine is currently available at the selected pharmacy. Please use the normal reservation process instead.',
      )
      return
    }

    try {
      setIsSubmitting(true)

      const requestData = {
        pharmacy_id:
          Number(selectedPharmacyId),

        notes:
          notes.trim() || null,

        items: [
          {
            medicine_id:
              medicineId,

            requested_quantity:
              parsedQuantity,

            notes: null,
          },
        ],
      }

      const createdRequest =
        await api.createMedicineRequest(
          requestData,
        )

      setSuccessMessage(
        `Medicine request #${createdRequest?.medicine_request_id || ''} submitted successfully.`,
      )

      resetForm()
    } catch (submitError) {
      console.error(
        'Medicine request error:',
        submitError,
      )

      setError(
        submitError.message ||
          'Failed to submit medicine request. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (authLoading || loadingData) {
    return (
      <main className="request-page">
        <div className="request-container">
          <div className="request-loading">
            <LoaderCircle
              size={24}
              className="spinner"
            />

            <span>
              Loading medicine request...
            </span>
          </div>
        </div>
      </main>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="request-page">
      <div className="request-container">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="request-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="request-header-copy">
            <span className="request-eyebrow">
              Medicine Request
            </span>

            <h1>
              Request an unavailable medicine
            </h1>

            <p className="request-description">
              Request an existing PharmaLink
              medicine that is currently
              unavailable or out of stock at
              a partner pharmacy.
            </p>
          </div>
        </header>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <AlertCircle
              size={20}
              className="alert-icon"
            />

            <span>{error}</span>

            <button
              type="button"
              className="alert-close"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            <CheckCircle2
              size={20}
              className="alert-icon"
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <div className="request-info-card">
          <PackageSearch size={22} />

          <div>
            <strong>
              When should I use this?
            </strong>

            <p>
              Use Medicine Request when the
              medicine already exists in
              PharmaLink but is currently
              unavailable at the pharmacy you
              want. If the medicine is in
              stock, reserve it instead.
            </p>
          </div>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          className="request-form"
          onSubmit={handleSubmit}
        >
          <div className="form-fields">
            {/* ================================================
                MEDICINE
            ================================================ */}

            <div className="form-group">
              <label htmlFor="medicineName">
                Medicine *
              </label>

              <p className="field-help">
                Search for an existing medicine
                in PharmaLink.
              </p>

              <div className="medicine-search-wrapper">
                <div className="search-input-wrapper">
                  <Search size={19} />

                  <input
                    id="medicineName"
                    type="text"
                    value={medicineQuery}
                    placeholder="Search medicine name, brand, or dosage"
                    autoComplete="off"
                    disabled={isSubmitting}
                    onChange={(event) =>
                      handleMedicineSearch(
                        event.target.value,
                      )
                    }
                    onFocus={() => {
                      if (
                        medicineQuery
                          .trim()
                          .length > 0 &&
                        !selectedMedicine
                      ) {
                        setShowMedicineSuggestions(
                          true,
                        )
                      }
                    }}
                  />

                  {medicineQuery && (
                    <button
                      type="button"
                      className="medicine-search-clear"
                      onClick={
                        clearSelectedMedicine
                      }
                      disabled={isSubmitting}
                      aria-label="Clear medicine"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                {showMedicineSuggestions &&
                  !selectedMedicine && (
                    <div className="suggestions-list">
                      {filteredMedicines.length >
                      0 ? (
                        filteredMedicines.map(
                          (medicine) => (
                            <button
                              key={
                                medicine.medicine_key
                              }
                              type="button"
                              className="suggestion-item"
                              disabled={
                                isSubmitting
                              }
                              onClick={() =>
                                handleSelectMedicine(
                                  medicine,
                                )
                              }
                            >
                              <div className="suggestion-icon">
                                <Pill
                                  size={18}
                                />
                              </div>

                              <div className="suggestion-content">
                                <strong className="suggestion-name">
                                  {getMedicineName(
                                    medicine,
                                  )}
                                </strong>

                                {getMedicineMeta(
                                  medicine,
                                ) && (
                                  <span className="suggestion-meta">
                                    {getMedicineMeta(
                                      medicine,
                                    )}
                                  </span>
                                )}

                                <span className="suggestion-meta">
                                  {medicine
                                    .requires_prescription
                                    ? 'Prescription required'
                                    : 'No prescription required'}
                                </span>
                              </div>
                            </button>
                          ),
                        )
                      ) : (
                        <div className="suggestions-empty">
                          <PackageSearch
                            size={20}
                          />

                          <div>
                            <strong>
                              No matching medicine
                            </strong>

                            <p>
                              Medicine Requests
                              can only be submitted
                              for medicines that
                              already exist in
                              PharmaLink.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* ================================================
                SELECTED MEDICINE
            ================================================ */}

            {selectedMedicine && (
              <div className="selected-medicine-card">
                <div className="selected-medicine-icon">
                  <Pill size={22} />
                </div>

                <div className="selected-medicine-info">
                  <span>
                    Selected medicine
                  </span>

                  <strong>
                    {getMedicineName(
                      selectedMedicine,
                    )}
                  </strong>

                  {getMedicineMeta(
                    selectedMedicine,
                  ) && (
                    <small>
                      {getMedicineMeta(
                        selectedMedicine,
                      )}
                    </small>
                  )}

                  {selectedMedicine
                    .requires_prescription && (
                    <small className="prescription-required">
                      Prescription required
                    </small>
                  )}
                </div>

                <Check
                  size={20}
                  className="selected-check"
                />
              </div>
            )}

            {/* ================================================
                PHARMACY
            ================================================ */}

            <div className="form-group">
              <label htmlFor="pharmacyId">
                Partner Pharmacy *
              </label>

              <p className="field-help">
                Choose the pharmacy that should
                receive this request.
              </p>

              <div className="select-wrapper">
                <Store size={19} />

                <select
                  id="pharmacyId"
                  value={selectedPharmacyId}
                  disabled={
                    isSubmitting ||
                    !selectedMedicine
                  }
                  required
                  onChange={(event) => {
                    setSelectedPharmacyId(
                      event.target.value,
                    )

                    setError('')
                    setSuccessMessage('')
                  }}
                >
                  <option value="">
                    Select partner pharmacy
                  </option>

                  {activePharmacies.map(
                    (pharmacy) => {
                      const pharmacyId =
                        getPharmacyId(
                          pharmacy,
                        )

                      if (!pharmacyId) {
                        return null
                      }

                      return (
                        <option
                          key={pharmacyId}
                          value={pharmacyId}
                        >
                          {pharmacy.name}
                        </option>
                      )
                    },
                  )}
                </select>

                <ChevronDown
                  size={18}
                  className="select-chevron"
                />
              </div>
            </div>

            {/* ================================================
                SELECTED PHARMACY DETAILS
            ================================================ */}

            {selectedPharmacy && (
              <div className="selected-pharmacy-card">
                <MapPin size={20} />

                <div>
                  <span>
                    Request will be sent to
                  </span>

                  <strong>
                    {selectedPharmacy.name}
                  </strong>

                  <small>
                    {selectedPharmacy.address ||
                      'Address unavailable'}
                  </small>
                </div>
              </div>
            )}

            {/* ================================================
                MEDICINE DOES NOT BELONG TO PHARMACY
            ================================================ */}

            {selectedMedicine &&
              selectedPharmacy &&
              !selectedOffering && (
                <div className="request-warning">
                  <AlertCircle size={19} />

                  <p>
                    This pharmacy does not
                    currently have a matching
                    record for this medicine.
                    Please choose another partner
                    pharmacy.
                  </p>
                </div>
              )}

            {/* ================================================
                CURRENTLY AVAILABLE
            ================================================ */}

            {selectedOffering &&
              !selectedOfferingIsOutOfStock &&
              Number.isFinite(
                Number(
                  selectedOffering.quantity,
                ),
              ) &&
              Number(
                selectedOffering.quantity,
              ) > 0 && (
                <div className="request-warning">
                  <AlertCircle size={19} />

                  <div>
                    <strong>
                      Medicine currently
                      available
                    </strong>

                    <p>
                      This pharmacy currently
                      has{' '}
                      {
                        selectedOffering.quantity
                      }{' '}
                      in stock. Please use the
                      normal reservation process
                      instead of submitting a
                      Medicine Request.
                    </p>
                  </div>
                </div>
              )}

            {/* ================================================
                QUANTITY
            ================================================ */}

            <div className="form-group">
              <label htmlFor="quantity">
                Requested Quantity *
              </label>

              <p className="field-help">
                Enter the number of units you
                want to ask the pharmacy about.
              </p>

              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                disabled={isSubmitting}
                required
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
              />
            </div>

            {/* ================================================
                NOTES
            ================================================ */}

            <div className="form-group">
              <label htmlFor="notes">
                Additional Notes
                <span className="optional-label">
                  {' '}
                  (Optional)
                </span>
              </label>

              <div className="textarea-wrapper">
                <FileText size={19} />

                <textarea
                  id="notes"
                  value={notes}
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                  placeholder="Add information that may help the pharmacy review your request."
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="field-counter">
                {notes.length}/500
              </div>
            </div>
          </div>

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <button
            type="submit"
            className={`submit-btn ${
              isSubmitting
                ? 'loading'
                : ''
            }`}
            disabled={
              isSubmitting ||
              !selectedMedicine ||
              !selectedPharmacyId ||
              !selectedOffering ||
              (Number.isFinite(
                Number(
                  selectedOffering?.quantity,
                ),
              ) &&
                Number(
                  selectedOffering?.quantity,
                ) > 0)
            }
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={19}
                  className="spinner"
                />

                Submitting request...
              </>
            ) : (
              <>
                <Send size={19} />
                Submit Medicine Request
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}

export default RequestMedicinePage