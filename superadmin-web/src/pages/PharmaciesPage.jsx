// File: superadmin-web/src/pages/PharmaciesPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Clock,
  X,
  XCircle,
} from 'lucide-react'

import ConfirmActionDialog from '../components/common/ConfirmActionDialog'
import PharmacyLocationPicker from '../components/pharmacy/PharmacyLocationPicker'

import {
  createPharmacy,
  getPharmacies,
  updatePharmacy,
  updatePharmacyStatus,
} from '../services/pharmacyService'

import {
  PHARMACY_SORT_OPTIONS,
  formatDisplayDate,
  loadSettings,
} from '../services/settingsService'

import { isWithinCebuBounds } from '../utils/cebuLocation'
import { PHARMACY_ACTIONS, getPharmacyActions } from '../utils/statusActions'

import './PharmaciesPage.css'

/* ============================================================
   CONSTANTS
============================================================ */

const EMPTY_FORM = {
  name: '',
  email: '',
  contact_number: '',
  status: '',

  // Location is established only in Step 2.
  address: '',
  latitude: '',
  longitude: '',
}

const ACTION_ICONS = {
  approve: Check,
  reject: XCircle,
  deactivate: Power,
  activate: Power,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]+$/

/* ============================================================
   HELPERS
============================================================ */

const getPharmacyId = (pharmacy) => pharmacy?.pharmacy_id ?? pharmacy?.id

const hasValue = (value) =>
  value !== '' && value !== null && value !== undefined

const normalizeStatus = (status) =>
  String(status || '').trim().toUpperCase()

const formatStatusLabel = (status) => {
  const normalized = normalizeStatus(status)

  return normalized
    ? normalized.charAt(0) + normalized.slice(1).toLowerCase()
    : 'Unknown'
}

const normalizeText = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const getTimestamp = (date) => {
  const time = date ? new Date(date).getTime() : NaN
  return Number.isFinite(time) ? time : 0
}

function pharmacyHasLocation(pharmacy) {
  if (!hasValue(pharmacy.latitude) || !hasValue(pharmacy.longitude)) {
    return false
  }

  const latitude = Number(pharmacy.latitude)
  const longitude = Number(pharmacy.longitude)

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function toForm(pharmacy) {
  return {
    name: pharmacy.name || '',
    email: pharmacy.email || '',
    contact_number: pharmacy.contact_number || '',
    status: pharmacy.status || '',
    address: pharmacy.address || '',
    latitude: hasValue(pharmacy.latitude) ? Number(pharmacy.latitude) : '',
    longitude: hasValue(pharmacy.longitude) ? Number(pharmacy.longitude) : '',
  }
}

function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = [
    ...new Set(
      [1, total, current - 1, current, current + 1].filter(
        (page) => page >= 1 && page <= total
      )
    ),
  ].sort((a, b) => a - b)

  const result = []

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      result.push(`gap-${page}`)
    }

    result.push(page)
  })

  return result
}

/* ============================================================
   PHARMACIES PAGE
============================================================ */

export function PharmaciesPage() {
  const [settings] = useState(() => loadSettings())
  const pageSize = settings.pharmacies.pageSize

  /* ==========================================================
     TABLE STATE
  ========================================================== */

  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sort, setSort] = useState(settings.pharmacies.defaultSort)
  const [currentPage, setCurrentPage] = useState(1)

  const [notice, setNotice] = useState('')

  // { type: 'approve' | 'reject' | 'activate' | 'deactivate', pharmacy }
  const [pendingAction, setPendingAction] = useState(null)

  /* ==========================================================
     MODAL STATE  (modalMode: null | 'create' | 'edit')
  ========================================================== */

  const [modalMode, setModalMode] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formStep, setFormStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEditing = modalMode === 'edit'

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  )

  /* ==========================================================
     LOAD
  ========================================================== */

  const loadPharmacies = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data = await getPharmacies()
      setPharmacies(Array.isArray(data) ? data : [])
    } catch (loadError) {
      console.error('Failed to load pharmacies:', loadError)
      setError(loadError.message || 'Failed to load pharmacies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPharmacies()
  }, [loadPharmacies])

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  /* ==========================================================
     FILTER + SEARCH + SORT
  ========================================================== */

  const statusOptions = useMemo(
    () =>
      [...new Set(pharmacies.map((p) => normalizeStatus(p.status)).filter(Boolean))].sort(),
    [pharmacies]
  )

  const pendingCount = useMemo(
    () => pharmacies.filter((p) => normalizeStatus(p.status) === 'PENDING').length,
    [pharmacies]
  )

  const filteredPharmacies = useMemo(() => {
    const tokens = normalizeText(search).split(' ').filter(Boolean)

    const filtered = pharmacies.filter((pharmacy) => {
      if (
        statusFilter !== 'all' &&
        normalizeStatus(pharmacy.status) !== statusFilter
      ) {
        return false
      }

      const located = pharmacyHasLocation(pharmacy)

      if (locationFilter === 'located' && !located) {
        return false
      }

      if (locationFilter === 'missing' && located) {
        return false
      }

      if (tokens.length === 0) {
        return true
      }

      // Every word must match somewhere — "asia labangon" finds
      // Asia Pharmacy in Labangon.
      const haystack = normalizeText(
        [
          pharmacy.name,
          pharmacy.address,
          pharmacy.email,
          pharmacy.contact_number,
          pharmacy.status,
        ].join(' ')
      )

      return tokens.every((token) => haystack.includes(token))
    })

    const byName = (a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, {
        sensitivity: 'base',
      })

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'az':
          return byName(a, b)
        case 'za':
          return byName(b, a)
        case 'oldest':
          return getTimestamp(a.created_at) - getTimestamp(b.created_at) || byName(a, b)
        default:
          return getTimestamp(b.created_at) - getTimestamp(a.created_at) || byName(a, b)
      }
    })
  }, [pharmacies, search, statusFilter, locationFilter, sort])

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (locationFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setLocationFilter('all')
    setCurrentPage(1)
  }

  const updateFilter = (setter) => (event) => {
    setter(event.target.value)
    setCurrentPage(1)
  }

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.max(1, Math.ceil(filteredPharmacies.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const displayedPharmacies = filteredPharmacies.slice(
    startIndex,
    startIndex + pageSize
  )

  const pageList = buildPageList(safePage, totalPages)

  /* ==========================================================
     MODAL OPEN / CLOSE
  ========================================================== */

  const openCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setInitialForm({ ...EMPTY_FORM })
    setFormStep(1)
    setFormError('')
  }

  const openEditModal = (pharmacy) => {
    const values = toForm(pharmacy)

    setModalMode('edit')
    setEditingId(getPharmacyId(pharmacy))
    setForm(values)
    setInitialForm(values)
    setFormStep(1)
    setFormError('')
  }

  const resetModal = () => {
    setModalMode(null)
    setEditingId(null)
    setFormStep(1)
    setForm({ ...EMPTY_FORM })
    setInitialForm({ ...EMPTY_FORM })
    setFormError('')
  }

  const closeModal = useCallback(() => {
    if (submitting) {
      return
    }

    if (
      isDirty &&
      !window.confirm('Discard the changes you made to this pharmacy?')
    ) {
      return
    }

    resetModal()
  }, [submitting, isDirty])

  useEffect(() => {
    if (!modalMode) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalMode, closeModal])

  /* ==========================================================
     FORM CHANGES
  ========================================================== */

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))

    if (formError) {
      setFormError('')
    }
  }

  const handleLocationChange = ({ address, latitude, longitude }) => {
    setForm((current) => ({
      ...current,
      address: address || '',
      latitude: latitude ?? '',
      longitude: longitude ?? '',
    }))

    setFormError('')
  }

  /* ==========================================================
     VALIDATION
  ========================================================== */

  const validatePharmacyInformation = () => {
    const name = form.name.trim()
    const email = form.email.trim()
    const contact = form.contact_number.trim()

    if (!name) {
      setFormError('Pharmacy name is required.')
      return false
    }

    if (name.length > 120) {
      setFormError('Pharmacy name must be 120 characters or fewer.')
      return false
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      setFormError('Please enter a valid pharmacy email address.')
      return false
    }

    if (contact) {
      const digits = contact.replace(/\D/g, '').length

      if (!PHONE_PATTERN.test(contact) || digits < 7 || digits > 15) {
        setFormError(
          'Please enter a valid contact number (e.g. 09171234567 or (032) 123 4567).'
        )
        return false
      }
    }

    if (settings.pharmacies.requireContactInfo && !email && !contact) {
      setFormError('Provide at least an email address or a contact number.')
      return false
    }

    return true
  }

  const validateLocation = () => {
    const address = form.address.trim()
    const hasLatitude = hasValue(form.latitude)
    const hasLongitude = hasValue(form.longitude)

    // Editing a pharmacy that never had a location: allowed to
    // save other details without setting one.
    if (isEditing && !address && !hasLatitude && !hasLongitude) {
      return true
    }

    if (!hasLatitude || !hasLongitude) {
      setFormError('Search for the pharmacy or click the map to place its pin.')
      return false
    }

    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setFormError('The selected map position is invalid. Place the pin again.')
      return false
    }

    const locationChanged =
      !isEditing ||
      latitude !== Number(initialForm.latitude) ||
      longitude !== Number(initialForm.longitude)

    if (locationChanged && !isWithinCebuBounds(latitude, longitude)) {
      setFormError('Partner pharmacies must be located within Cebu province.')
      return false
    }

    if (!address) {
      setFormError('Enter the pharmacy address shown to customers.')
      return false
    }

    return true
  }

  const findDuplicate = () => {
    const name = normalizeText(form.name)
    const address = normalizeText(form.address)

    if (!address) {
      return null
    }

    return pharmacies.find(
      (pharmacy) =>
        getPharmacyId(pharmacy) !== editingId &&
        normalizeText(pharmacy.name) === name &&
        normalizeText(pharmacy.address) === address
    )
  }

  /* ==========================================================
     STEP NAVIGATION
  ========================================================== */

  const goToStep = (step) => {
    if (step === formStep) {
      return
    }

    setFormError('')

    if (step === 2 && !validatePharmacyInformation()) {
      return
    }

    setFormStep(step)
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      contact_number: form.contact_number.trim() || null,
    }

    if (hasValue(form.latitude) && hasValue(form.longitude)) {
      payload.address = form.address.trim()
      payload.latitude = Number(form.latitude)
      payload.longitude = Number(form.longitude)
    }

    return payload
  }

  const submitPharmacy = async () => {
    setFormError('')

    if (!validatePharmacyInformation()) {
      setFormStep(1)
      return
    }

    if (!validateLocation()) {
      setFormStep(2)
      return
    }

    const duplicate = findDuplicate()

    if (duplicate) {
      setFormError(`"${duplicate.name}" is already registered at this address.`)
      return
    }

    if (isEditing && !isDirty) {
      resetModal()
      return
    }

    const payload = buildPayload()

    try {
      setSubmitting(true)

      if (isEditing) {
        const updated = await updatePharmacy(editingId, payload)

        setPharmacies((current) =>
          current.map((pharmacy) =>
            getPharmacyId(pharmacy) === editingId
              ? {
                  ...pharmacy,
                  ...payload,
                  ...(updated && typeof updated === 'object' ? updated : {}),
                }
              : pharmacy
          )
        )

        setNotice(`${payload.name} was updated.`)
      } else {
        const created = await createPharmacy(payload)

        setPharmacies((current) => [created, ...current])
        setCurrentPage(1)
        setNotice(`${payload.name} was added as a partner pharmacy.`)
      }

      resetModal()
    } catch (submitError) {
      console.error(
        isEditing ? 'Failed to update pharmacy:' : 'Failed to create pharmacy:',
        submitError
      )

      setFormError(
        submitError.message ||
          (isEditing
            ? 'Failed to update the pharmacy.'
            : 'Failed to create partner pharmacy.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()

    // Enter on step 1 of a new pharmacy moves to the Location step.
    if (formStep === 1 && !isEditing) {
      goToStep(2)
      return
    }

    submitPharmacy()
  }

  /* ==========================================================
     STATUS ACTIONS (approve / reject / activate / deactivate)
  ========================================================== */

  const confirmStatusAction = async (reason) => {
    const { type, pharmacy } = pendingAction
    const action = PHARMACY_ACTIONS[type]
    const pharmacyId = getPharmacyId(pharmacy)

    const updated = await updatePharmacyStatus(pharmacyId, action.nextStatus, reason)

    setPharmacies((current) =>
      current.map((item) =>
        getPharmacyId(item) === pharmacyId
          ? {
              ...item,
              status: action.nextStatus,
              ...(updated && typeof updated === 'object' ? updated : {}),
            }
          : item
      )
    )

    setPendingAction(null)
    setNotice(action.notice(pharmacy.name || 'The pharmacy'))
  }

  const activeAction = pendingAction ? PHARMACY_ACTIONS[pendingAction.type] : null

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* STICKY PAGE HEADER */}

      <div className="page-header-sticky">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <h1>Pharmacies</h1>
            </div>

            <p>Manage partner pharmacies registered in PharmaLink.</p>
          </div>

          <div className="page-header-actions">
            <div className="pharmacy-count">
              {pharmacies.length}{' '}
              {pharmacies.length === 1 ? 'pharmacy' : 'pharmacies'}
            </div>

            <button
              type="button"
              className="add-pharmacy-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              <span>Add Partner Pharmacy</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}

      <div className="page-content-wrapper">
        <div className="pharmacies-page">
          {notice && (
            <div className="pharmacy-notice" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {pendingCount > 0 && statusFilter !== 'PENDING' && (
            <div className="pharmacy-pending-banner">
              <Clock size={17} />
              <span>
                <strong>{pendingCount}</strong>{' '}
                {pendingCount === 1 ? 'pharmacy is' : 'pharmacies are'} waiting for
                approval.
              </span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('PENDING')
                  setCurrentPage(1)
                }}
              >
                Review now
              </button>
            </div>
          )}

          {/* TOOLBAR */}

          <div className="pharmacy-toolbar">
            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search by name, address, email, or phone..."
                value={search}
                onChange={updateFilter(setSearch)}
              />

              {search && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={() => {
                    setSearch('')
                    setCurrentPage(1)
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="toolbar-filters">
              <label className="sort-box">
                <Filter size={16} />
                <select
                  value={statusFilter}
                  onChange={updateFilter(setStatusFilter)}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sort-box">
                <MapPin size={16} />
                <select
                  value={locationFilter}
                  onChange={updateFilter(setLocationFilter)}
                  aria-label="Filter by location"
                >
                  <option value="all">All locations</option>
                  <option value="located">Located</option>
                  <option value="missing">Not set</option>
                </select>
              </label>

              <label className="sort-box">
                <ArrowUpDown size={16} />
                <select
                  value={sort}
                  onChange={updateFilter(setSort)}
                  aria-label="Sort pharmacies"
                >
                  {PHARMACY_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="clear-filters-button"
                  onClick={clearFilters}
                >
                  <RotateCcw size={14} />
                  Clear ({activeFilterCount})
                </button>
              )}

              <button
                type="button"
                className="toolbar-icon-button"
                onClick={loadPharmacies}
                disabled={loading}
                aria-label="Refresh pharmacies"
                title="Refresh"
              >
                <RefreshCw size={16} className={loading ? 'pharmacy-spin' : ''} />
              </button>
            </div>
          </div>

          {/* TABLE */}

          <div className="pharmacy-table-card">
            {loading && pharmacies.length === 0 ? (
              <div className="table-state">
                <Loader2 size={18} className="pharmacy-spin" />
                Loading pharmacies...
              </div>
            ) : error ? (
              <div className="table-state error">
                <span>{error}</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadPharmacies}
                >
                  Try again
                </button>
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className="table-state">
                <span>
                  {activeFilterCount > 0
                    ? 'No pharmacies match your search or filters.'
                    : 'No pharmacies found.'}
                </span>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="pharmacy-table">
                  <thead>
                    <tr>
                      <th>Pharmacy</th>
                      <th>Contact</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th className="actions-heading">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedPharmacies.map((pharmacy) => {
                      const pharmacyId = getPharmacyId(pharmacy)
                      const hasLocation = pharmacyHasLocation(pharmacy)

                      return (
                        <tr key={pharmacyId}>
                          {/* PHARMACY */}

                          <td>
                            <div className="pharmacy-name-cell">
                              <div className="pharmacy-icon">
                                <Building2 size={18} />
                              </div>

                              <div className="pharmacy-name-text">
                                <strong title={pharmacy.name}>{pharmacy.name}</strong>

                                {pharmacy.address && (
                                  <div className="pharmacy-address" title={pharmacy.address}>
                                    <MapPin size={13} />
                                    <span>{pharmacy.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* CONTACT */}

                          <td>
                            <div className="contact-cell">
                              {pharmacy.email && (
                                <div title={pharmacy.email}>
                                  <Mail size={14} />
                                  <span>{pharmacy.email}</span>
                                </div>
                              )}

                              {pharmacy.contact_number && (
                                <div>
                                  <Phone size={14} />
                                  <span>{pharmacy.contact_number}</span>
                                </div>
                              )}

                              {!pharmacy.email && !pharmacy.contact_number && (
                                <span className="empty-value">—</span>
                              )}
                            </div>
                          </td>

                          {/* LOCATION */}

                          <td>
                            {hasLocation ? (
                              <a
                                className="location-badge located"
                                href={`https://www.openstreetmap.org/?mlat=${pharmacy.latitude}&mlon=${pharmacy.longitude}#map=18/${pharmacy.latitude}/${pharmacy.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in OpenStreetMap"
                              >
                                <CheckCircle2 size={14} />
                                Located
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="location-badge missing">
                                <AlertCircle size={14} />
                                Not set
                              </span>
                            )}
                          </td>

                          {/* STATUS */}

                          <td>
                            <span
                              className={`status-badge ${normalizeStatus(
                                pharmacy.status
                              ).toLowerCase()}`}
                            >
                              {pharmacy.status || 'Unknown'}
                            </span>
                          </td>

                          {/* REGISTERED */}

                          <td>
                            <span className="registered-date">
                              {formatDisplayDate(pharmacy.created_at, settings.general)}
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td className="actions-cell">
                            <div className="row-actions">
                              {getPharmacyActions(pharmacy.status).map((type) => {
                                const Icon = ACTION_ICONS[type]

                                const label = PHARMACY_ACTIONS[type].label
                                const showText = type === 'approve'

                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    className={`row-action-button action-${type} ${showText ? '' : 'icon-only'}`}
                                    onClick={() => setPendingAction({ type, pharmacy })}
                                    aria-label={`${label} ${pharmacy.name}`}
                                    title={label}
                                  >
                                    <Icon size={14} />
                                    {showText && <span>{label}</span>}
                                  </button>
                                )
                              })}

                              <button
                                type="button"
                                className="row-action-button icon-only"
                                onClick={() => openEditModal(pharmacy)}
                                aria-label={`Edit ${pharmacy.name}`}
                                title="Edit details"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
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

          {!error && filteredPharmacies.length > 0 && (
            <div className="table-footer">
              <span>
                Showing {startIndex + 1}–
                {Math.min(startIndex + pageSize, filteredPharmacies.length)} of{' '}
                {filteredPharmacies.length}{' '}
                {filteredPharmacies.length === 1 ? 'pharmacy' : 'pharmacies'}
                {filteredPharmacies.length !== pharmacies.length &&
                  ` (filtered from ${pharmacies.length})`}
              </span>

              <div className="pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                {pageList.map((item) =>
                  typeof item === 'number' ? (
                    <button
                      type="button"
                      key={item}
                      className={`page-number ${item === safePage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                      aria-current={item === safePage ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="page-gap">
                      …
                    </span>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ADD / EDIT MODAL */}

          {modalMode && (
            <div
              className="pharmacy-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeModal()
                }
              }}
            >
              <div
                className="pharmacy-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pharmacy-modal-title"
              >
                {/* HEADER */}

                <div className="pharmacy-modal-header">
                  <div className="modal-title-row">
                    <div className="modal-title-icon">
                      {isEditing ? <Pencil size={19} /> : <Building2 size={20} />}
                    </div>

                    <div>
                      <h2 id="pharmacy-modal-title">
                        {isEditing ? 'Edit Pharmacy' : 'Add Partner Pharmacy'}
                      </h2>

                      <p>
                        {isEditing
                          ? `Update the details for ${initialForm.name || 'this pharmacy'}.`
                          : 'Register a pharmacy partner in PharmaLink.'}
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

                {/* STEPS */}

                <div className="pharmacy-form-steps">
                  <button
                    type="button"
                    className={`form-step ${
                      formStep === 1 ? 'active' : 'complete'
                    }`}
                    onClick={() => goToStep(1)}
                    disabled={submitting}
                  >
                    <span>{formStep > 1 ? '✓' : '1'}</span>
                    <div>
                      <strong>Pharmacy</strong>
                      <small>Basic information</small>
                    </div>
                  </button>

                  <div className="step-line" />

                  <button
                    type="button"
                    className={`form-step ${formStep === 2 ? 'active' : ''}`}
                    onClick={() => goToStep(2)}
                    disabled={submitting}
                  >
                    <span>2</span>
                    <div>
                      <strong>Location</strong>
                      <small>Physical location</small>
                    </div>
                  </button>
                </div>

                {/* FORM */}

                <form onSubmit={handleFormSubmit} noValidate>
                  {formStep === 1 && (
                    <div className="pharmacy-form-content">
                      <div className="form-section-heading">
                        <h3>Pharmacy Information</h3>
                        <p>
                          Enter the official identity and contact information
                          for the partner pharmacy.
                        </p>
                      </div>

                      <div className="pharmacy-form-grid">
                        <div className="form-group full-width">
                          <label htmlFor="pharmacy-name">
                            Pharmacy Name
                            <span>*</span>
                          </label>

                          <input
                            id="pharmacy-name"
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleFormChange}
                            placeholder="Enter pharmacy name"
                            autoComplete="organization"
                            maxLength={120}
                            autoFocus
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="pharmacy-email">
                            Pharmacy Email
                            {settings.pharmacies.requireContactInfo && <span>*</span>}
                          </label>

                          <input
                            id="pharmacy-email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleFormChange}
                            placeholder="pharmacy@example.com"
                            autoComplete="email"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="pharmacy-contact">
                            Contact Number
                            {settings.pharmacies.requireContactInfo && <span>*</span>}
                          </label>

                          <input
                            id="pharmacy-contact"
                            type="tel"
                            name="contact_number"
                            value={form.contact_number}
                            onChange={handleFormChange}
                            placeholder="09XXXXXXXXX"
                            autoComplete="tel"
                          />
                        </div>

                      </div>

                      <div className="location-step-hint">
                        <MapPin size={18} />

                        <div>
                          <strong>
                            {isEditing ? 'Location' : 'Address comes next'}
                          </strong>

                          <p>
                            {isEditing
                              ? form.address
                                ? form.address
                                : 'No location set yet. Open the Location step to place this pharmacy on the map.'
                              : 'The pharmacy address and exact map location will be set together in the Location step.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formStep === 2 && (
                    <div className="pharmacy-form-content">
                      <div className="form-section-heading">
                        <h3>Pharmacy Location</h3>
                        <p>
                          Search for the partner pharmacy or address, then
                          confirm its exact physical location on the map.
                        </p>
                      </div>

                      <PharmacyLocationPicker
                        value={{
                          address: form.address,
                          latitude: form.latitude,
                          longitude: form.longitude,
                        }}
                        onChange={handleLocationChange}
                      />
                    </div>
                  )}

                  {formError && (
                    <div className="form-error-message" role="alert">
                      <AlertCircle size={17} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* FOOTER */}

                  <div className="pharmacy-modal-footer">
                    {formStep === 1 ? (
                      <>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={closeModal}
                          disabled={submitting}
                        >
                          Cancel
                        </button>

                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => goToStep(2)}
                              disabled={submitting}
                            >
                              Edit Location
                              <ChevronRight size={17} />
                            </button>

                            <button
                              type="submit"
                              className="primary-button"
                              disabled={submitting || !isDirty}
                            >
                              {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                          </>
                        ) : (
                          <button type="submit" className="primary-button">
                            Next: Location
                            <ChevronRight size={17} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => goToStep(1)}
                          disabled={submitting}
                        >
                          <ChevronLeft size={17} />
                          Back
                        </button>

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={submitting || (isEditing && !isDirty)}
                        >
                          {submitting
                            ? isEditing
                              ? 'Saving...'
                              : 'Creating...'
                            : isEditing
                              ? 'Save Changes'
                              : 'Create Partner Pharmacy'}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          <ConfirmActionDialog
            open={Boolean(pendingAction)}
            tone={activeAction?.tone}
            title={activeAction?.title(pendingAction?.pharmacy?.name || 'this pharmacy')}
            message={activeAction?.message}
            details={
              pendingAction && (
                <>
                  <strong>{pendingAction.pharmacy.name}</strong>
                  {pendingAction.pharmacy.address && (
                    <div>{pendingAction.pharmacy.address}</div>
                  )}
                  <div>
                    Status: {formatStatusLabel(pendingAction.pharmacy.status)} →{' '}
                    {formatStatusLabel(activeAction?.nextStatus)}
                  </div>
                </>
              )
            }
            confirmLabel={activeAction?.confirmLabel}
            reasonMode={activeAction?.reasonMode}
            reasonPlaceholder={activeAction?.reasonPlaceholder}
            onConfirm={confirmStatusAction}
            onClose={() => setPendingAction(null)}
          />
        </div>
      </div>
    </>
  )
}
