// File: customer-pwa/src/pages/RequestMedicinePage.jsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  PackageSearch,
  Pill,
  Search,
  Send,
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

function getMedicineId(medicine) {
  const value =
    medicine?.medicine_id ??
    medicine?.id

  const number = Number(value)

  return Number.isInteger(number) && number > 0
    ? number
    : null
}

/**
 * Customer search results represent logical medicines,
 * but the backend still uses pharmacy-owned medicine rows.
 *
 * We only need one valid medicine_id as a reference when
 * the customer selects an existing PharmaLink medicine.
 */
function getRepresentativeMedicineId(medicine) {
  if (!medicine) {
    return null
  }

  const directId = getMedicineId(medicine)

  if (directId) {
    return directId
  }

  if (Array.isArray(medicine.offerings)) {
    for (const offering of medicine.offerings) {
      const offeringId = getMedicineId(offering)

      if (offeringId) {
        return offeringId
      }
    }
  }

  return null
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

    group.offerings.push(entry)
  }

  return Array.from(groups.values())
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

  const [medicineQuery, setMedicineQuery] =
    useState('')

  const [
    selectedMedicine,
    setSelectedMedicine,
  ] = useState(null)

  const [
    useManualEntry,
    setUseManualEntry,
  ] = useState(false)

  const [
    manualMedicineName,
    setManualMedicineName,
  ] = useState('')

  const [
    manualBrandName,
    setManualBrandName,
  ] = useState('')

  const [
    manualDosage,
    setManualDosage,
  ] = useState('')

  const [
    manualDosageForm,
    setManualDosageForm,
  ] = useState('')

  const [quantity, setQuantity] =
    useState(1)

  const [notes, setNotes] =
    useState('')

  const [
    showMedicineSuggestions,
    setShowMedicineSuggestions,
  ] = useState(false)

  const [
    loadingData,
    setLoadingData,
  ] = useState(true)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

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
  // LOAD PHARMALINK MEDICINES
  // ==========================================================

  useEffect(() => {
    let isCurrent = true

    async function loadMedicines() {
      try {
        setLoadingData(true)
        setError('')

        const medicinesData =
          await api.getAvailableMedicines()

        if (!isCurrent) {
          return
        }

        setRawMedicines(
          Array.isArray(medicinesData)
            ? medicinesData
            : [],
        )
      } catch (loadError) {
        console.error(
          'Failed to load medicines:',
          loadError,
        )

        if (isCurrent) {
          setError(
            loadError.message ||
              'Unable to load PharmaLink medicines. You can still enter the medicine manually.',
          )
        }
      } finally {
        if (isCurrent) {
          setLoadingData(false)
        }
      }
    }

    if (!authLoading && user) {
      loadMedicines()
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
        const searchable =
          normalizeText(
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
      .slice(0, 8)
  }, [
    medicineGroups,
    medicineQuery,
  ])

  // ==========================================================
  // SEARCH HANDLERS
  // ==========================================================

  function handleMedicineSearch(value) {
    setMedicineQuery(value)
    setSelectedMedicine(null)
    setUseManualEntry(false)
    setError('')
    setSuccessMessage('')

    setShowMedicineSuggestions(
      value.trim().length > 0,
    )
  }

  function handleSelectMedicine(medicine) {
    setSelectedMedicine(medicine)

    setMedicineQuery(
      getMedicineName(medicine),
    )

    setUseManualEntry(false)
    setShowMedicineSuggestions(false)
    setError('')
    setSuccessMessage('')
  }

  function clearSelectedMedicine() {
    setSelectedMedicine(null)
    setMedicineQuery('')
    setUseManualEntry(false)
    setShowMedicineSuggestions(false)
    setError('')
    setSuccessMessage('')
  }

  function startManualEntry() {
    const typedValue =
      medicineQuery.trim()

    setSelectedMedicine(null)
    setShowMedicineSuggestions(false)
    setUseManualEntry(true)

    if (
      typedValue &&
      !manualMedicineName
    ) {
      setManualMedicineName(typedValue)
    }

    setError('')
    setSuccessMessage('')
  }

  function cancelManualEntry() {
    setUseManualEntry(false)
    setManualMedicineName('')
    setManualBrandName('')
    setManualDosage('')
    setManualDosageForm('')
    setMedicineQuery('')
    setError('')
  }

  // ==========================================================
  // RESET
  // ==========================================================

  function resetForm() {
    setMedicineQuery('')
    setSelectedMedicine(null)
    setUseManualEntry(false)

    setManualMedicineName('')
    setManualBrandName('')
    setManualDosage('')
    setManualDosageForm('')

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

    let requestItem

    // --------------------------------------------------------
    // Existing PharmaLink medicine
    // --------------------------------------------------------

    if (selectedMedicine) {
      const medicineId =
        getRepresentativeMedicineId(
          selectedMedicine,
        )

      if (!medicineId) {
        setError(
          'The selected medicine could not be identified. Please select it again or enter it manually.',
        )

        return
      }

      requestItem = {
        medicine_id: medicineId,

        requested_quantity:
          parsedQuantity,

        notes: null,
      }
    }

    // --------------------------------------------------------
    // Manual medicine
    // --------------------------------------------------------

    else if (useManualEntry) {
      const medicineName =
        manualMedicineName.trim()

      if (!medicineName) {
        setError(
          'Please enter the medicine name.',
        )

        return
      }

      requestItem = {
        medicine_id: null,

        medicine_name:
          medicineName,

        brand_name:
          manualBrandName.trim() ||
          null,

        dosage:
          manualDosage.trim() ||
          null,

        dosage_form:
          manualDosageForm.trim() ||
          null,

        requested_quantity:
          parsedQuantity,

        notes: null,
      }
    }

    // --------------------------------------------------------
    // Nothing selected / entered
    // --------------------------------------------------------

    else {
      setError(
        'Select a PharmaLink medicine or enter the medicine manually.',
      )

      return
    }

    try {
      setIsSubmitting(true)

      const createdRequest =
        await api.createMedicineRequest({
          notes:
            notes.trim() || null,

          items: [
            requestItem,
          ],
        })

      setSuccessMessage(
        `Medicine request #${
          createdRequest
            ?.medicine_request_id || ''
        } was sent to PharmaLink partner pharmacies.`,
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
      <main className="request-medicine-page">
        <div className="request-medicine-container">
          <div className="request-medicine-loading">
            <LoaderCircle
              size={24}
              className="spinner"
            />

            <span>
              Loading medicines...
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
    <main className="request-medicine-page">
      <div className="request-medicine-container">

        {/* HEADER */}

        <header className="request-medicine-header">
          <button
            type="button"
            className="request-medicine-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
            <span>Back</span>
          </button>

          <div className="request-medicine-heading">
            <span className="request-medicine-eyebrow">
              Medicine Request
            </span>

            <h1>
              Looking for a medicine?
            </h1>

            <p>
              Send a request to PharmaLink partner
              pharmacies. Pharmacies that can help
              can respond with their availability.
            </p>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div
            className="request-medicine-alert request-medicine-alert-error"
            role="alert"
          >
            <AlertCircle size={20} />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUCCESS */}

        {successMessage && (
          <div className="request-medicine-success">
            <div className="request-medicine-success-content">
              <CheckCircle2 size={20} />

              <div>
                <strong>Request sent successfully</strong>

                <p>
                  Partner pharmacies can now respond to your
                  medicine request.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="request-medicine-view-requests"
              onClick={() => navigate('/my-requests')}
            >
              View My Requests
            </button>
          </div>
        )}

        {/* EXPLANATION */}

        <section className="request-medicine-info">
          <div className="request-medicine-info-icon">
            <PackageSearch size={21} />
          </div>

          <div>
            <strong>
              How Medicine Requests work
            </strong>

            <p>
              Search PharmaLink first, or enter the
              medicine yourself if you cannot find
              it. Your request is shared with
              participating partner pharmacies.
            </p>
          </div>
        </section>

        {/* FORM */}

        <form
          className="request-medicine-form"
          onSubmit={handleSubmit}
        >
          <section className="request-medicine-section">
            <div className="request-medicine-section-heading">
              <span className="request-medicine-step">
                1
              </span>

              <div>
                <h2>
                  Medicine
                </h2>

                <p>
                  Search the PharmaLink catalog or
                  enter the medicine manually.
                </p>
              </div>
            </div>

            {/* SEARCH */}

            {!useManualEntry && (
              <div className="request-medicine-field">
                <label htmlFor="medicineSearch">
                  Search medicine
                </label>

                <div className="request-medicine-search">
                  <Search size={19} />

                  <input
                    id="medicineSearch"
                    type="text"
                    value={medicineQuery}
                    placeholder="Medicine name, brand, or dosage"
                    autoComplete="off"
                    disabled={isSubmitting}
                    onChange={(event) =>
                      handleMedicineSearch(
                        event.target.value,
                      )
                    }
                    onFocus={() => {
                      if (
                        medicineQuery.trim() &&
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
                      className="request-medicine-clear"
                      onClick={
                        clearSelectedMedicine
                      }
                      disabled={isSubmitting}
                      aria-label="Clear medicine search"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                {/* SEARCH RESULTS */}

                {showMedicineSuggestions &&
                  !selectedMedicine && (
                    <div className="request-medicine-suggestions">
                      {filteredMedicines.length >
                      0 ? (
                        <>
                          {filteredMedicines.map(
                            (medicine) => (
                              <button
                                key={
                                  medicine.medicine_key
                                }
                                type="button"
                                className="request-medicine-suggestion"
                                onClick={() =>
                                  handleSelectMedicine(
                                    medicine,
                                  )
                                }
                                disabled={
                                  isSubmitting
                                }
                              >
                                <span className="request-medicine-suggestion-icon">
                                  <Pill
                                    size={18}
                                  />
                                </span>

                                <span className="request-medicine-suggestion-copy">
                                  <strong>
                                    {getMedicineName(
                                      medicine,
                                    )}
                                  </strong>

                                  {getMedicineMeta(
                                    medicine,
                                  ) && (
                                    <small>
                                      {getMedicineMeta(
                                        medicine,
                                      )}
                                    </small>
                                  )}

                                  <small>
                                    {medicine
                                      .requires_prescription
                                      ? 'Prescription required'
                                      : 'No prescription required'}
                                  </small>
                                </span>
                              </button>
                            ),
                          )}

                          <div className="request-medicine-manual-row">
                            <span>
                              Can't find the exact
                              medicine?
                            </span>

                            <button
                              type="button"
                              onClick={
                                startManualEntry
                              }
                            >
                              Enter manually
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="request-medicine-no-results">
                          <PackageSearch
                            size={22}
                          />

                          <div>
                            <strong>
                              No exact match found
                            </strong>

                            <p>
                              You can still send a
                              request by entering the
                              medicine details
                              yourself.
                            </p>

                            <button
                              type="button"
                              onClick={
                                startManualEntry
                              }
                            >
                              Enter medicine manually
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {!selectedMedicine &&
                  !showMedicineSuggestions && (
                    <button
                      type="button"
                      className="request-medicine-manual-link"
                      onClick={startManualEntry}
                    >
                      Can't find it? Enter medicine
                      manually
                    </button>
                  )}
              </div>
            )}

            {/* SELECTED MEDICINE */}

            {selectedMedicine && (
              <div className="request-medicine-selected">
                <div className="request-medicine-selected-icon">
                  <Pill size={21} />
                </div>

                <div className="request-medicine-selected-copy">
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
                    <small className="request-medicine-rx">
                      Prescription required
                    </small>
                  )}
                </div>

                <button
                  type="button"
                  className="request-medicine-change"
                  onClick={
                    clearSelectedMedicine
                  }
                  disabled={isSubmitting}
                >
                  Change
                </button>
              </div>
            )}

            {/* MANUAL ENTRY */}

            {useManualEntry && (
              <div className="request-medicine-manual">
                <div className="request-medicine-manual-header">
                  <div>
                    <strong>
                      Enter medicine details
                    </strong>

                    <p>
                      Add what you know. Only the
                      medicine name is required.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      cancelManualEntry
                    }
                    disabled={isSubmitting}
                  >
                    Use search
                  </button>
                </div>

                <div className="request-medicine-manual-grid">
                  <div className="request-medicine-field request-medicine-field-wide">
                    <label htmlFor="manualMedicineName">
                      Medicine name *
                    </label>

                    <input
                      id="manualMedicineName"
                      type="text"
                      value={
                        manualMedicineName
                      }
                      placeholder="e.g. Amoxicillin"
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setManualMedicineName(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="request-medicine-field">
                    <label htmlFor="manualBrandName">
                      Brand
                      <span>
                        {' '}(Optional)
                      </span>
                    </label>

                    <input
                      id="manualBrandName"
                      type="text"
                      value={manualBrandName}
                      placeholder="e.g. Amoxil"
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setManualBrandName(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="request-medicine-field">
                    <label htmlFor="manualDosage">
                      Dosage
                      <span>
                        {' '}(Optional)
                      </span>
                    </label>

                    <input
                      id="manualDosage"
                      type="text"
                      value={manualDosage}
                      placeholder="e.g. 500 mg"
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setManualDosage(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="request-medicine-field request-medicine-field-wide">
                    <label htmlFor="manualDosageForm">
                      Dosage form
                      <span>
                        {' '}(Optional)
                      </span>
                    </label>

                    <input
                      id="manualDosageForm"
                      type="text"
                      value={
                        manualDosageForm
                      }
                      placeholder="e.g. Capsule, tablet, syrup"
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setManualDosageForm(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* QUANTITY */}

          <section className="request-medicine-section">
            <div className="request-medicine-section-heading">
              <span className="request-medicine-step">
                2
              </span>

              <div>
                <h2>
                  Quantity
                </h2>

                <p>
                  How many units are you looking for?
                </p>
              </div>
            </div>

            <div className="request-medicine-field">
              <label htmlFor="requestQuantity">
                Requested quantity *
              </label>

              <input
                id="requestQuantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                disabled={isSubmitting}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
              />
            </div>
          </section>

          {/* NOTES */}

          <section className="request-medicine-section">
            <div className="request-medicine-section-heading">
              <span className="request-medicine-step">
                3
              </span>

              <div>
                <h2>
                  Additional information
                </h2>

                <p>
                  Add anything that may help
                  pharmacies understand the request.
                </p>
              </div>
            </div>

            <div className="request-medicine-field">
              <label htmlFor="requestNotes">
                Notes
                <span>
                  {' '}(Optional)
                </span>
              </label>

              <div className="request-medicine-textarea">
                <FileText size={18} />

                <textarea
                  id="requestNotes"
                  value={notes}
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                  placeholder="Add any helpful details..."
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="request-medicine-counter">
                {notes.length}/500
              </div>
            </div>
          </section>

          {/* BROADCAST NOTE */}

          <div className="request-medicine-broadcast">
            <Send size={20} />

            <div>
              <strong>
                Sent to partner pharmacies
              </strong>

              <p>
                Your request is not a reservation.
                Partner pharmacies can respond if
                they can help, and you can compare
                their responses before deciding
                what to do next.
              </p>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="request-medicine-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={19}
                  className="spinner"
                />

                Sending request...
              </>
            ) : (
              <>
                <Send size={19} />

                Send Request to Pharmacies
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}

export default RequestMedicinePage