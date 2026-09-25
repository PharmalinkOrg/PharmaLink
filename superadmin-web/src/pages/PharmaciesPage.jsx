import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Search,
  ArrowUpDown,
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import PharmacyLocationPicker from '../components/pharmacy/PharmacyLocationPicker'

import {
  getPharmacies,
  createPharmacy,
} from '../services/pharmacyService'

import './Pharmaciespage.css'

/* ============================================================
   INITIAL FORM STATE
============================================================ */

const EMPTY_FORM = {
  name: '',
  email: '',
  contact_number: '',

  // Location is established only in Step 2.
  address: '',
  latitude: '',
  longitude: '',
}

/* ============================================================
   PHARMACIES PAGE
============================================================ */

export function PharmaciesPage() {
  /* ==========================================================
     PHARMACY TABLE STATE
  ========================================================== */

  const [pharmacies, setPharmacies] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  const pharmaciesPerPage = 5

  /* ==========================================================
     ADD PARTNER PHARMACY MODAL STATE
  ========================================================== */

  const [showAddModal, setShowAddModal] = useState(false)
  const [formStep, setFormStep] = useState(1)

  const [form, setForm] = useState(EMPTY_FORM)

  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* ==========================================================
     LOAD PHARMACIES
  ========================================================== */

  const loadPharmacies = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await getPharmacies()

      setPharmacies(data)
    } catch (error) {
      console.error(
        'Failed to load pharmacies:',
        error
      )

      setError(
        error.message ||
          'Failed to load pharmacies'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPharmacies()
  }, [])

  /* ==========================================================
     SEARCH + SORT
  ========================================================== */

  const filteredPharmacies = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    const filtered = pharmacies.filter(
      (pharmacy) => {
        if (!query) {
          return true
        }

        return [
          pharmacy.name,
          pharmacy.address,
          pharmacy.email,
          pharmacy.contact_number,
          pharmacy.status,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query)
        )
      }
    )

    return [...filtered].sort((a, b) => {
      if (sort === 'az') {
        return (a.name || '').localeCompare(
          b.name || ''
        )
      }

      const dateA = a.created_at
        ? new Date(a.created_at).getTime()
        : 0

      const dateB = b.created_at
        ? new Date(b.created_at).getTime()
        : 0

      return dateB - dateA
    })
  }, [pharmacies, search, sort])

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.ceil(
    filteredPharmacies.length /
      pharmaciesPerPage
  )

  const startIndex =
    (currentPage - 1) *
    pharmaciesPerPage

  const displayedPharmacies =
    filteredPharmacies.slice(
      startIndex,
      startIndex + pharmaciesPerPage
    )

  /* ==========================================================
     GENERAL HELPERS
  ========================================================== */

  const formatDate = (date) => {
    if (!date) {
      return '—'
    }

    const parsedDate = new Date(date)

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '—'
    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    )
  }

  const pharmacyHasLocation = (
    pharmacy
  ) => {
    const hasLatitude =
      pharmacy.latitude !== null &&
      pharmacy.latitude !== undefined &&
      pharmacy.latitude !== ''

    const hasLongitude =
      pharmacy.longitude !== null &&
      pharmacy.longitude !== undefined &&
      pharmacy.longitude !== ''

    if (!hasLatitude || !hasLongitude) {
      return false
    }

    const latitude = Number(
      pharmacy.latitude
    )

    const longitude = Number(
      pharmacy.longitude
    )

    return (
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180
    )
  }

  /* ==========================================================
     SEARCH / SORT HANDLERS
  ========================================================== */

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const handleSort = (event) => {
    setSort(event.target.value)
    setCurrentPage(1)
  }

  /* ==========================================================
     MODAL
  ========================================================== */

  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
    })

    setFormStep(1)
    setFormError('')
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    if (submitting) {
      return
    }

    setShowAddModal(false)
    setFormStep(1)

    setForm({
      ...EMPTY_FORM,
    })

    setFormError('')
  }

  /* ==========================================================
     NORMAL FORM INPUT CHANGE
  ========================================================== */

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (formError) {
      setFormError('')
    }
  }

  /* ==========================================================
     STEP 1 VALIDATION

     Step 1 is ONLY responsible for:
       - pharmacy name
       - pharmacy email
       - contact number

     Address/location is NOT entered here.
  ========================================================== */

  const validatePharmacyInformation =
    () => {
      if (!form.name.trim()) {
        setFormError(
          'Pharmacy name is required.'
        )

        return false
      }

      if (
        form.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.email.trim()
        )
      ) {
        setFormError(
          'Please enter a valid pharmacy email address.'
        )

        return false
      }

      return true
    }

  const handleContinueToLocation =
    () => {
      setFormError('')

      if (
        !validatePharmacyInformation()
      ) {
        return
      }

      setFormStep(2)
    }

  /* ==========================================================
     STEP 2 LOCATION CHANGE

     PharmacyLocationPicker supplies all three values together:

       address
       latitude
       longitude

     This makes Step 2 the authoritative source for the
     pharmacy's physical location.
  ========================================================== */

  const handleLocationChange = ({
    address,
    latitude,
    longitude,
  }) => {
    setForm((current) => ({
      ...current,
      address: address || '',
      latitude:
        latitude ?? '',
      longitude:
        longitude ?? '',
    }))

    setFormError('')
  }

  /* ==========================================================
     STEP 2 LOCATION VALIDATION
  ========================================================== */

  const validateLocation = () => {
    /*
     * IMPORTANT:
     *
     * Do not simply use:
     *
     * Number(form.latitude)
     *
     * before checking for null/empty values because:
     *
     * Number(null) === 0
     * Number('') === 0
     *
     * That could incorrectly treat a missing coordinate
     * as a real coordinate.
     */

    if (!form.address.trim()) {
      setFormError(
        'Please search for and confirm the pharmacy location.'
      )

      return false
    }

    const hasLatitude =
      form.latitude !== '' &&
      form.latitude !== null &&
      form.latitude !== undefined

    const hasLongitude =
      form.longitude !== '' &&
      form.longitude !== null &&
      form.longitude !== undefined

    if (
      !hasLatitude ||
      !hasLongitude
    ) {
      setFormError(
        'Please confirm the pharmacy location on the map.'
      )

      return false
    }

    const latitude = Number(
      form.latitude
    )

    const longitude = Number(
      form.longitude
    )

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setFormError(
        'The selected pharmacy latitude is invalid.'
      )

      return false
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setFormError(
        'The selected pharmacy longitude is invalid.'
      )

      return false
    }

    return true
  }

  /* ==========================================================
     CREATE PHARMACY
  ========================================================== */

  const handleCreatePharmacy =
    async (event) => {
      event.preventDefault()

      setFormError('')

      /*
       * Validate Step 1 again.
       */

      if (
        !validatePharmacyInformation()
      ) {
        setFormStep(1)

        return
      }

      /*
       * Validate Step 2.
       */

      if (!validateLocation()) {
        setFormStep(2)

        return
      }

      try {
        setSubmitting(true)

        /*
         * The final pharmacy payload now has one
         * authoritative location.
         *
         * Step 1:
         *   name
         *   email
         *   contact_number
         *
         * Step 2:
         *   address
         *   latitude
         *   longitude
         */

        const payload = {
          name:
            form.name.trim(),

          email:
            form.email.trim() ||
            null,

          contact_number:
            form.contact_number.trim() ||
            null,

          address:
            form.address.trim(),

          latitude:
            Number(
              form.latitude
            ),

          longitude:
            Number(
              form.longitude
            ),
        }

        const createdPharmacy =
          await createPharmacy(
            payload
          )

        /*
         * Immediately add the newly created pharmacy
         * to the local table.
         */

        setPharmacies(
          (current) => [
            createdPharmacy,
            ...current,
          ]
        )

        setCurrentPage(1)

        /*
         * Close and reset the form.
         */

        setShowAddModal(false)
        setFormStep(1)

        setForm({
          ...EMPTY_FORM,
        })

        setFormError('')
      } catch (error) {
        console.error(
          'Failed to create pharmacy:',
          error
        )

        setFormError(
          error.message ||
            'Failed to create partner pharmacy.'
        )
      } finally {
        setSubmitting(false)
      }
    }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="pharmacies-page">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="page-header">
        <div>
          <div className="page-title-row">
            <Building2 size={24} />

            <h1>
              Pharmacies
            </h1>
          </div>

          <p>
            Manage partner pharmacies
            registered in PharmaLink.
          </p>
        </div>

        <div className="page-header-actions">
          <div className="pharmacy-count">
            {pharmacies.length}{' '}

            {pharmacies.length === 1
              ? 'pharmacy'
              : 'pharmacies'}
          </div>

          <button
            type="button"
            className="add-pharmacy-button"
            onClick={
              openAddModal
            }
          >
            <Plus size={18} />

            <span>
              Add Partner Pharmacy
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div className="pharmacy-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search pharmacies..."
            value={search}
            onChange={
              handleSearch
            }
          />
        </div>

        <div className="sort-box">
          <ArrowUpDown
            size={17}
          />

          <select
            value={sort}
            onChange={
              handleSort
            }
          >
            <option value="newest">
              Newest to Oldest
            </option>

            <option value="az">
              A–Z
            </option>
          </select>
        </div>
      </div>

      {/* ======================================================
          PHARMACY TABLE
      ====================================================== */}

      <div className="pharmacy-table-card">
        {loading ? (
          <div className="table-state">
            Loading pharmacies...
          </div>
        ) : error ? (
          <div className="table-state error">
            {error}
          </div>
        ) : filteredPharmacies.length ===
          0 ? (
          <div className="table-state">
            {search
              ? 'No pharmacies match your search.'
              : 'No pharmacies found.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>
                    Pharmacy
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Registered
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayedPharmacies.map(
                  (pharmacy) => {
                    const hasLocation =
                      pharmacyHasLocation(
                        pharmacy
                      )

                    return (
                      <tr
                        key={
                          pharmacy.pharmacy_id
                        }
                      >
                        {/* ================================
                            PHARMACY
                        ================================ */}

                        <td>
                          <div className="pharmacy-name-cell">
                            <div className="pharmacy-icon">
                              <Building2
                                size={18}
                              />
                            </div>

                            <div>
                              <strong>
                                {
                                  pharmacy.name
                                }
                              </strong>

                              {pharmacy.address && (
                                <div className="pharmacy-address">
                                  <MapPin
                                    size={13}
                                  />

                                  <span>
                                    {
                                      pharmacy.address
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ================================
                            CONTACT
                        ================================ */}

                        <td>
                          <div className="contact-cell">
                            {pharmacy.email && (
                              <div>
                                <Mail
                                  size={14}
                                />

                                <span>
                                  {
                                    pharmacy.email
                                  }
                                </span>
                              </div>
                            )}

                            {pharmacy.contact_number && (
                              <div>
                                <Phone
                                  size={14}
                                />

                                <span>
                                  {
                                    pharmacy.contact_number
                                  }
                                </span>
                              </div>
                            )}

                            {!pharmacy.email &&
                              !pharmacy.contact_number && (
                                <span className="empty-value">
                                  —
                                </span>
                              )}
                          </div>
                        </td>

                        {/* ================================
                            LOCATION
                        ================================ */}

                        <td>
                          {hasLocation ? (
                            <span className="location-badge located">
                              <CheckCircle2
                                size={14}
                              />

                              Located
                            </span>
                          ) : (
                            <span className="location-badge missing">
                              <AlertCircle
                                size={14}
                              />

                              Not set
                            </span>
                          )}
                        </td>

                        {/* ================================
                            STATUS
                        ================================ */}

                        <td>
                          <span
                            className={`status-badge ${String(
                              pharmacy.status ||
                                ''
                            ).toLowerCase()}`}
                          >
                            {pharmacy.status ||
                              'Unknown'}
                          </span>
                        </td>

                        {/* ================================
                            REGISTERED
                        ================================ */}

                        <td>
                          <span className="registered-date">
                            {formatDate(
                              pharmacy.created_at
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {!loading &&
        !error &&
        filteredPharmacies.length >
          0 && (
          <div className="table-footer">
            <span>
              Showing{' '}
              {startIndex + 1}–
              {Math.min(
                startIndex +
                  pharmaciesPerPage,
                filteredPharmacies.length
              )}{' '}
              of{' '}
              {
                filteredPharmacies.length
              }{' '}
              pharmacies
            </span>

            <div className="pagination">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        page - 1,
                        1
                      )
                  )
                }
                disabled={
                  currentPage === 1
                }
              >
                Previous
              </button>

              <span>
                Page{' '}
                {currentPage}{' '}
                of{' '}
                {Math.max(
                  totalPages,
                  1
                )}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        page + 1,
                        totalPages
                      )
                  )
                }
                disabled={
                  currentPage >=
                  totalPages
                }
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* ======================================================
          ADD PARTNER PHARMACY MODAL
      ====================================================== */}

      {showAddModal && (
        <div
          className="pharmacy-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddModal()
            }
          }}
        >
          <div
            className="pharmacy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pharmacy-title"
          >
            {/* ================================================
                MODAL HEADER
            ================================================ */}

            <div className="pharmacy-modal-header">
              <div>
                <div className="modal-title-row">
                  <div className="modal-title-icon">
                    <Building2
                      size={20}
                    />
                  </div>

                  <div>
                    <h2 id="add-pharmacy-title">
                      Add Partner Pharmacy
                    </h2>

                    <p>
                      Register a pharmacy partner
                      in PharmaLink.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeAddModal
                }
                disabled={
                  submitting
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* ================================================
                STEPS
            ================================================ */}

            <div className="pharmacy-form-steps">
              {/* STEP 1 */}

              <div
                className={`form-step ${
                  formStep === 1
                    ? 'active'
                    : formStep > 1
                      ? 'complete'
                      : ''
                }`}
              >
                <span>
                  {formStep > 1
                    ? '✓'
                    : '1'}
                </span>

                <div>
                  <strong>
                    Pharmacy
                  </strong>

                  <small>
                    Basic information
                  </small>
                </div>
              </div>

              <div className="step-line" />

              {/* STEP 2 */}

              <div
                className={`form-step ${
                  formStep === 2
                    ? 'active'
                    : ''
                }`}
              >
                <span>
                  2
                </span>

                <div>
                  <strong>
                    Location
                  </strong>

                  <small>
                    Physical location
                  </small>
                </div>
              </div>
            </div>

            {/* ================================================
                FORM
            ================================================ */}

            <form
              onSubmit={
                handleCreatePharmacy
              }
            >
              {/* ==============================================
                  STEP 1
                  PHARMACY INFORMATION
              ============================================== */}

              {formStep === 1 && (
                <div className="pharmacy-form-content">
                  <div className="form-section-heading">
                    <h3>
                      Pharmacy Information
                    </h3>

                    <p>
                      Enter the official identity
                      and contact information for
                      the partner pharmacy.
                    </p>
                  </div>

                  <div className="pharmacy-form-grid">
                    {/* Pharmacy Name */}

                    <div className="form-group full-width">
                      <label htmlFor="pharmacy-name">
                        Pharmacy Name

                        <span>
                          *
                        </span>
                      </label>

                      <input
                        id="pharmacy-name"
                        type="text"
                        name="name"
                        value={
                          form.name
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="Enter pharmacy name"
                        autoComplete="organization"
                      />
                    </div>

                    {/* Pharmacy Email */}

                    <div className="form-group">
                      <label htmlFor="pharmacy-email">
                        Pharmacy Email
                      </label>

                      <input
                        id="pharmacy-email"
                        type="email"
                        name="email"
                        value={
                          form.email
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="pharmacy@example.com"
                        autoComplete="email"
                      />
                    </div>

                    {/* Contact Number */}

                    <div className="form-group">
                      <label htmlFor="pharmacy-contact">
                        Contact Number
                      </label>

                      <input
                        id="pharmacy-contact"
                        type="tel"
                        name="contact_number"
                        value={
                          form.contact_number
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="09XXXXXXXXX"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* ==========================================
                      LOCATION INFORMATION NOTICE
                  ========================================== */}

                  <div className="location-step-hint">
                    <MapPin
                      size={18}
                    />

                    <div>
                      <strong>
                        Address comes next
                      </strong>

                      <p>
                        The pharmacy address and
                        exact map location will be
                        established together in the
                        Location step.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================================
                  STEP 2
                  REAL MAP LOCATION PICKER
              ============================================== */}

              {formStep === 2 && (
                <div className="pharmacy-form-content">
                  <div className="form-section-heading">
                    <h3>
                      Pharmacy Location
                    </h3>

                    <p>
                      Search for the partner pharmacy
                      or address, then confirm its exact
                      physical location on the map.
                    </p>
                  </div>

                  <PharmacyLocationPicker
                    value={{
                      address:
                        form.address,

                      latitude:
                        form.latitude,

                      longitude:
                        form.longitude,
                    }}
                    onChange={
                      handleLocationChange
                    }
                  />
                </div>
              )}

              {/* ==============================================
                  FORM ERROR
              ============================================== */}

              {formError && (
                <div className="form-error-message">
                  <AlertCircle
                    size={17}
                  />

                  <span>
                    {formError}
                  </span>
                </div>
              )}

              {/* ==============================================
                  MODAL FOOTER
              ============================================== */}

              <div className="pharmacy-modal-footer">
                {formStep === 1 ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        closeAddModal
                      }
                      disabled={
                        submitting
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        handleContinueToLocation
                      }
                    >
                      Next: Location

                      <ChevronRight
                        size={17}
                      />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setFormError('')
                        setFormStep(1)
                      }}
                      disabled={
                        submitting
                      }
                    >
                      <ChevronLeft
                        size={17}
                      />

                      Back
                    </button>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        submitting
                      }
                    >
                      {submitting
                        ? 'Creating...'
                        : 'Create Partner Pharmacy'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}