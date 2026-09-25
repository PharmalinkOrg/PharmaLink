import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Search,
  ArrowUpDown,
  Mail,
  Phone,
  Plus,
  X,
  UserRound,
  AlertCircle,
} from 'lucide-react'

import {
  getPharmacyAdmins,
  createPharmacyAdmin,
} from '../services/pharmacyAdminService'

import {
  getPharmacies,
} from '../services/pharmacyService'

import './PharmacyAdminsPage.css'

const EMPTY_FORM = {
  pharmacy_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
}

export function PharmacyAdminsPage() {
  const [admins, setAdmins] = useState([])
  const [pharmacies, setPharmacies] = useState([])

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const adminsPerPage = 5

  /* ============================================================
     LOAD DATA
  ============================================================ */

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [
        adminData,
        pharmacyData,
      ] = await Promise.all([
        getPharmacyAdmins(),
        getPharmacies(),
      ])

      setAdmins(adminData)
      setPharmacies(pharmacyData)
    } catch (error) {
      console.error(
        'Failed to load pharmacy admins:',
        error
      )

      setError(
        error.message ||
          'Failed to load pharmacy admins'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* ============================================================
     PHARMACY LOOKUP
  ============================================================ */

  const pharmacyMap = useMemo(() => {
    return new Map(
      pharmacies.map((pharmacy) => [
        Number(pharmacy.pharmacy_id),
        pharmacy,
      ])
    )
  }, [pharmacies])

  const getPharmacyName = (pharmacyId) => {
    if (!pharmacyId) {
      return 'Not assigned'
    }

    return (
      pharmacyMap.get(Number(pharmacyId))?.name ||
      'Unknown pharmacy'
    )
  }

  /* ============================================================
     SEARCH + SORT
  ============================================================ */

  const filteredAdmins = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    const filtered = admins.filter((admin) => {
      if (!query) {
        return true
      }

      const fullName =
        `${admin.first_name || ''} ${admin.last_name || ''}`.trim()

      const pharmacyName =
        getPharmacyName(admin.pharmacy_id)

      return [
        fullName,
        admin.email,
        admin.phone,
        admin.status,
        pharmacyName,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'az') {
        const nameA =
          `${a.first_name || ''} ${a.last_name || ''}`.trim()

        const nameB =
          `${b.first_name || ''} ${b.last_name || ''}`.trim()

        return nameA.localeCompare(nameB)
      }

      const idA = Number(a.user_id) || 0
      const idB = Number(b.user_id) || 0

      return idB - idA
    })
  }, [
    admins,
    search,
    sort,
    pharmacyMap,
  ])

  /* ============================================================
     PAGINATION
  ============================================================ */

  const totalPages = Math.ceil(
    filteredAdmins.length / adminsPerPage
  )

  const startIndex =
    (currentPage - 1) * adminsPerPage

  const displayedAdmins =
    filteredAdmins.slice(
      startIndex,
      startIndex + adminsPerPage
    )

  /* ============================================================
     MODAL
  ============================================================ */

  const openModal = () => {
    setForm({
      ...EMPTY_FORM,
    })

    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (submitting) {
      return
    }

    setShowModal(false)

    setForm({
      ...EMPTY_FORM,
    })

    setFormError('')
  }

  /* ============================================================
     FORM
  ============================================================ */

  const handleFormChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setFormError('')
  }

  const validateForm = () => {
    if (!form.pharmacy_id) {
      setFormError(
        'Please select a pharmacy.'
      )

      return false
    }

    if (!form.first_name.trim()) {
      setFormError(
        'First name is required.'
      )

      return false
    }

    if (!form.last_name.trim()) {
      setFormError(
        'Last name is required.'
      )

      return false
    }

    if (!form.email.trim()) {
      setFormError(
        'Email address is required.'
      )

      return false
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      setFormError(
        'Please enter a valid email address.'
      )

      return false
    }

    if (form.password.length < 8) {
      setFormError(
        'Password must contain at least 8 characters.'
      )

      return false
    }

    if (
      form.password !==
      form.confirm_password
    ) {
      setFormError(
        'Passwords do not match.'
      )

      return false
    }

    return true
  }

  /* ============================================================
     CREATE ADMIN
  ============================================================ */

  const handleCreateAdmin = async (event) => {
    event.preventDefault()

    setFormError('')

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        pharmacy_id:
          Number(form.pharmacy_id),

        first_name:
          form.first_name.trim(),

        last_name:
          form.last_name.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        phone:
          form.phone.trim() || null,

        password:
          form.password,
      }

      await createPharmacyAdmin(payload)

      /*
       * Reload from the backend instead of guessing
       * the returned user structure.
       */

      const updatedAdmins =
        await getPharmacyAdmins()

      setAdmins(updatedAdmins)

      setCurrentPage(1)

      setShowModal(false)

      setForm({
        ...EMPTY_FORM,
      })
    } catch (error) {
      console.error(
        'Failed to create pharmacy admin:',
        error
      )

      setFormError(
        error.message ||
          'Failed to create pharmacy admin.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="pharmacies-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <div className="page-title-row">
            <UserRound size={24} />

            <h1>
              Pharmacy Admins
            </h1>
          </div>

          <p>
            Manage administrator accounts assigned
            to PharmaLink partner pharmacies.
          </p>
        </div>

        <div className="page-header-actions">
          <div className="pharmacy-count">
            {admins.length}{' '}
            {admins.length === 1
              ? 'admin'
              : 'admins'}
          </div>

          <button
            type="button"
            className="add-pharmacy-button"
            onClick={openModal}
          >
            <Plus size={18} />

            Add Pharmacy Admin
          </button>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="pharmacy-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search pharmacy admins..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <div className="sort-box">
          <ArrowUpDown size={17} />

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setCurrentPage(1)
            }}
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

      {/* TABLE */}

      <div className="pharmacy-table-card">
        {loading ? (
          <div className="table-state">
            Loading pharmacy admins...
          </div>
        ) : error ? (
          <div className="table-state error">
            {error}
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="table-state">
            {search
              ? 'No pharmacy admins match your search.'
              : 'No pharmacy admins found.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Pharmacy</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {displayedAdmins.map((admin) => {
                  const fullName =
                    `${admin.first_name || ''} ${admin.last_name || ''}`.trim()

                  return (
                    <tr key={admin.user_id}>
                      <td>
                        <div className="pharmacy-name-cell">
                          <div className="pharmacy-icon">
                            <UserRound size={18} />
                          </div>

                          <div>
                            <strong>
                              {fullName || 'Unnamed Admin'}
                            </strong>

                            <div className="pharmacy-address">
                              <Mail size={13} />

                              <span>
                                {admin.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="contact-cell">
                          <div>
                            <Building2 size={14} />

                            <span>
                              {getPharmacyName(
                                admin.pharmacy_id
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="contact-cell">
                          <div>
                            <Mail size={14} />

                            <span>
                              {admin.email || '—'}
                            </span>
                          </div>

                          {admin.phone && (
                            <div>
                              <Phone size={14} />

                              <span>
                                {admin.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${String(
                            admin.status || ''
                          ).toLowerCase()}`}
                        >
                          {admin.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}

      {!loading &&
        !error &&
        filteredAdmins.length > 0 && (
          <div className="table-footer">
            <span>
              Showing {startIndex + 1}–
              {Math.min(
                startIndex + adminsPerPage,
                filteredAdmins.length
              )}{' '}
              of {filteredAdmins.length} admins
            </span>

            <div className="pagination">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(page - 1, 1)
                  )
                }
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <span>
                Page {currentPage} of{' '}
                {Math.max(totalPages, 1)}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                  )
                }
                disabled={
                  currentPage >= totalPages
                }
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* ======================================================
          CREATE PHARMACY ADMIN MODAL
      ====================================================== */}

      {showModal && (
        <div
          className="pharmacy-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal()
            }
          }}
        >
          <div
            className="pharmacy-modal pharmacy-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pharmacy-admin-title"
          >
            <div className="pharmacy-modal-header">
              <div className="modal-title-row">
                <div className="modal-title-icon">
                  <UserRound size={20} />
                </div>

                <div>
                  <h2 id="add-pharmacy-admin-title">
                    Add Pharmacy Admin
                  </h2>

                  <p>
                    Create an administrator account
                    for a partner pharmacy.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin}>
              <div className="pharmacy-form-content">
                <div className="form-section-heading">
                  <h3>
                    Administrator Information
                  </h3>

                  <p>
                    Assign this administrator to an
                    existing partner pharmacy.
                  </p>
                </div>

                <div className="pharmacy-form-grid">
                  {/* PHARMACY */}

                  <div className="form-group full-width">
                    <label htmlFor="admin-pharmacy">
                      Partner Pharmacy
                      <span>*</span>
                    </label>

                    <select
                      id="admin-pharmacy"
                      name="pharmacy_id"
                      value={form.pharmacy_id}
                      onChange={handleFormChange}
                    >
                      <option value="">
                        Select a partner pharmacy
                      </option>

                      {pharmacies
                        .filter(
                          (pharmacy) =>
                            pharmacy.status === 'ACTIVE'
                        )
                        .map((pharmacy) => (
                          <option
                            key={pharmacy.pharmacy_id}
                            value={pharmacy.pharmacy_id}
                          >
                            {pharmacy.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* FIRST NAME */}

                  <div className="form-group">
                    <label htmlFor="admin-first-name">
                      First Name
                      <span>*</span>
                    </label>

                    <input
                      id="admin-first-name"
                      type="text"
                      name="first_name"
                      value={form.first_name}
                      onChange={handleFormChange}
                      placeholder="First name"
                    />
                  </div>

                  {/* LAST NAME */}

                  <div className="form-group">
                    <label htmlFor="admin-last-name">
                      Last Name
                      <span>*</span>
                    </label>

                    <input
                      id="admin-last-name"
                      type="text"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleFormChange}
                      placeholder="Last name"
                    />
                  </div>

                  {/* EMAIL */}

                  <div className="form-group">
                    <label htmlFor="admin-email">
                      Email
                      <span>*</span>
                    </label>

                    <input
                      id="admin-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="admin@example.com"
                      autoComplete="email"
                    />
                  </div>

                  {/* PHONE */}

                  <div className="form-group">
                    <label htmlFor="admin-phone">
                      Phone
                    </label>

                    <input
                      id="admin-phone"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      placeholder="09XXXXXXXXX"
                      autoComplete="tel"
                    />
                  </div>

                  {/* PASSWORD */}

                  <div className="form-group">
                    <label htmlFor="admin-password">
                      Temporary Password
                      <span>*</span>
                    </label>

                    <input
                      id="admin-password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleFormChange}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div className="form-group">
                    <label htmlFor="admin-confirm-password">
                      Confirm Password
                      <span>*</span>
                    </label>

                    <input
                      id="admin-confirm-password"
                      type="password"
                      name="confirm_password"
                      value={form.confirm_password}
                      onChange={handleFormChange}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="form-error-message">
                  <AlertCircle size={17} />

                  <span>
                    {formError}
                  </span>
                </div>
              )}

              <div className="pharmacy-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Creating...'
                    : 'Create Pharmacy Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}