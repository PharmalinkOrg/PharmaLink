// File: admin-web/src/pages/MedicinesPage.jsx
//
// Full-width medicine table with search + filters.
// Add / Edit happen in a modal opened from the header button
// or a row's Edit action.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import Select from '../components/ui/Select'

import './MedicinesPage.css'

// =========================================================
// CONSTANTS
// =========================================================

const ITEMS_PER_PAGE = 15

const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'mL', 'L', 'IU', '%', 'units']

const DOSAGE_UNIT_OPTIONS = DOSAGE_UNITS.map((unit) => ({
  value: unit,
  label: unit,
}))

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const PRESCRIPTION_OPTIONS = [
  { value: 'ALL', label: 'Any prescription' },
  { value: 'YES', label: 'Requires Rx' },
  { value: 'NO', label: 'No Rx needed' },
]

const emptyForm = {
  category_id: '',
  generic_name: '',
  brand_name: '',
  dosage: '',
  dosage_unit: 'mg',
  description: '',
  requires_prescription: false,
}

// =========================================================
// HELPERS
// =========================================================

/**
 * Some older records store the unit inside `dosage`
 * (e.g. "500mg") and also have dosage_unit = "mg", which
 * showed as "500mg mg". Only append the unit when the
 * dosage is a plain number.
 */
function formatDosage(item) {
  const text = String(item?.dosage ?? '').trim()

  if (!text) return '—'

  const unit = item?.dosage_unit

  if (!unit || /[a-z%]/i.test(text)) return text

  return `${text} ${unit}`
}

/**
 * When editing, split "500 mg" / "500mg" into
 * { dosage: "500", dosage_unit: "mg" } so the form shows
 * the number and the unit separately.
 */
function splitDosage(dosage, unit) {
  const text = String(dosage ?? '').trim()

  const match = text.match(
    /^(\d+(?:\.\d+)?)\s*(mg|g|mcg|ml|l|iu|%|units?)$/i
  )

  if (match) {
    const typed = match[2].toLowerCase()
    const normalized = typed === 'unit' ? 'units' : typed

    const found = DOSAGE_UNITS.find(
      (option) => option.toLowerCase() === normalized
    )

    return {
      dosage: match[1],
      dosage_unit: found || unit || 'mg',
    }
  }

  return {
    dosage: text,
    dosage_unit: DOSAGE_UNITS.includes(unit) ? unit : 'mg',
  }
}

function formatStatus(status) {
  const text = String(status || 'UNKNOWN').toLowerCase()

  return text.charAt(0).toUpperCase() + text.slice(1)
}

// =========================================================
// ICONS (inline, no extra dependency)
// =========================================================

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// =========================================================
// ADD / EDIT MODAL
// =========================================================

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

function MedicineFormModal({
  open,
  mode,
  initialForm,
  categoryOptions,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  const panelRef = useRef(null)
  const firstInputRef = useRef(null)

  // Latest values for the keyboard listener
  const isSavingRef = useRef(isSaving)
  const onCloseRef = useRef(onClose)
  isSavingRef.current = isSaving
  onCloseRef.current = onClose

  // Reset fields every time the modal opens
  useEffect(() => {
    if (open) {
      setForm(initialForm)
      setErrors({})
    }
  }, [open, initialForm])

  // Focus, Escape to close, keep Tab inside the modal
  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return

      if (event.key === 'Escape') {
        if (!isSavingRef.current) onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll(FOCUSABLE)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  if (!open) return null

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const handleInput = (event) => {
    const { name, value, type, checked } = event.target

    setField(name, type === 'checkbox' ? checked : value)
  }

  const validate = (values) => {
    const next = {}

    if (!values.generic_name.trim()) {
      next.generic_name = 'Enter the generic name.'
    }

    if (!values.category_id) {
      next.category_id = 'Choose a category.'
    }

    if (!String(values.dosage).trim()) {
      next.dosage = 'Enter the dosage strength.'
    }

    return next
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = validate(form)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        panelRef.current
          ?.querySelector('[aria-invalid="true"]')
          ?.focus()
      })

      return
    }

    onSubmit({
      ...form,
      generic_name: form.generic_name.trim(),
      brand_name: form.brand_name.trim(),
      dosage: String(form.dosage).trim(),
      description: form.description.trim(),
    })
  }

  const isEdit = mode === 'edit'
  const noCategories = categoryOptions.length === 0

  return createPortal(
    <div
      className="med-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        className="med-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="med-modal-title"
      >
        <header className="med-modal-header">
          <div>
            <h3 id="med-modal-title">
              {isEdit ? 'Edit medicine' : 'Add medicine'}
            </h3>
            <p>
              {isEdit
                ? 'Update the details customers see for this medicine.'
                : 'Add a medicine to your pharmacy catalog.'}
            </p>
          </div>

          <button
            type="button"
            className="med-icon-btn"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="med-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="med-modal-body">
            {serverError && (
              <p
                className="med-banner med-banner-error med-field-full"
                role="alert"
              >
                {serverError}
              </p>
            )}

            {noCategories && (
              <p className="med-banner med-banner-warning med-field-full">
                No categories available yet. Add a category before
                creating medicines.
              </p>
            )}

            {/* Generic name */}
            <div className="med-field">
              <label className="med-label" htmlFor="med-generic">
                Generic name
                <span className="med-req" aria-hidden="true">*</span>
              </label>

              <input
                ref={firstInputRef}
                id="med-generic"
                name="generic_name"
                className={`med-input${
                  errors.generic_name ? ' is-invalid' : ''
                }`}
                value={form.generic_name}
                onChange={handleInput}
                placeholder="e.g., Paracetamol"
                autoComplete="off"
                required
                aria-invalid={Boolean(errors.generic_name)}
                aria-describedby={
                  errors.generic_name
                    ? 'med-generic-error'
                    : undefined
                }
              />

              {errors.generic_name && (
                <p id="med-generic-error" className="med-field-error">
                  {errors.generic_name}
                </p>
              )}
            </div>

            {/* Brand name */}
            <div className="med-field">
              <label className="med-label" htmlFor="med-brand">
                Brand name
                <span className="med-optional">Optional</span>
              </label>

              <input
                id="med-brand"
                name="brand_name"
                className="med-input"
                value={form.brand_name}
                onChange={handleInput}
                placeholder="e.g., Biogesic"
                autoComplete="off"
              />
            </div>

            {/* Category */}
            <div className="med-field">
              <label
                className="med-label"
                id="med-category-label"
                htmlFor="med-category"
              >
                Category
                <span className="med-req" aria-hidden="true">*</span>
              </label>

              <Select
                id="med-category"
                aria-labelledby="med-category-label"
                aria-describedby={
                  errors.category_id
                    ? 'med-category-error'
                    : undefined
                }
                value={form.category_id}
                onChange={(value) =>
                  setField('category_id', String(value))
                }
                options={categoryOptions}
                placeholder="Select a category"
                invalid={Boolean(errors.category_id)}
                disabled={noCategories}
              />

              {errors.category_id && (
                <p id="med-category-error" className="med-field-error">
                  {errors.category_id}
                </p>
              )}
            </div>

            {/* Dosage + unit */}
            <div className="med-field">
              <label className="med-label" htmlFor="med-dosage">
                Dosage
                <span className="med-req" aria-hidden="true">*</span>
              </label>

              <div className="med-dosage">
                <input
                  id="med-dosage"
                  name="dosage"
                  className={`med-input${
                    errors.dosage ? ' is-invalid' : ''
                  }`}
                  value={form.dosage}
                  onChange={handleInput}
                  placeholder="e.g., 500"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(errors.dosage)}
                  aria-describedby={
                    errors.dosage ? 'med-dosage-error' : undefined
                  }
                />

                <Select
                  id="med-dosage-unit"
                  aria-label="Dosage unit"
                  value={form.dosage_unit}
                  onChange={(value) => setField('dosage_unit', value)}
                  options={DOSAGE_UNIT_OPTIONS}
                />
              </div>

              {errors.dosage && (
                <p id="med-dosage-error" className="med-field-error">
                  {errors.dosage}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="med-field med-field-full">
              <label className="med-label" htmlFor="med-description">
                Description
                <span className="med-optional">Optional</span>
              </label>

              <textarea
                id="med-description"
                name="description"
                className="med-input med-textarea"
                value={form.description}
                onChange={handleInput}
                rows={3}
                placeholder="Short notes about this medicine, e.g., use, form or pack size."
              />
            </div>

            {/* Prescription */}
            <label className="med-check med-field-full">
              <input
                type="checkbox"
                name="requires_prescription"
                checked={form.requires_prescription}
                onChange={handleInput}
              />

              <span>
                <strong>Requires prescription</strong>
                <span>
                  Customers must upload a valid prescription before
                  reserving this medicine.
                </span>
              </span>
            </label>
          </div>

          <footer className="med-modal-footer">
            <button
              type="button"
              className="med-btn med-btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="med-btn med-btn-primary"
              disabled={isSaving || noCategories}
            >
              {isSaving
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add medicine'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}

// =========================================================
// PAGE
// =========================================================

function MedicinesPage() {
  const { accessToken, user } = useAuth()

  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])

  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal
  const [modal, setModal] = useState({
    open: false,
    mode: 'create',
    editingId: null,
    initialForm: emptyForm,
  })
  const [formError, setFormError] = useState('')

  // Search + filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [prescriptionFilter, setPrescriptionFilter] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const pharmacyId = user?.pharmacy_id

  // -------------------------------------------------------
  // Load data
  // -------------------------------------------------------

  useEffect(() => {
    if (!accessToken || !pharmacyId) return undefined

    let isCurrent = true

    apiRequest(`/medicines?pharmacy_id=${pharmacyId}`, {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setMedicines(
            Array.isArray(response?.data) ? response.data : []
          )
          setLoadError('')
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setLoadError(
            requestError.message || 'Unable to load medicines.'
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, pharmacyId, refreshKey])

  useEffect(() => {
    if (!accessToken) return undefined

    let isCurrent = true

    apiRequest('/medicine-categories', { token: accessToken })
      .then((response) => {
        if (isCurrent) {
          setCategories(
            Array.isArray(response?.data) ? response.data : []
          )
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setLoadError(
            requestError.message || 'Unable to load categories.'
          )
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  // Auto-hide success messages
  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => setNotice(''), 5000)

    return () => window.clearTimeout(timer)
  }, [notice])

  // -------------------------------------------------------
  // Categories
  // -------------------------------------------------------

  const categoryNameById = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          String(category.category_id),
          category.name,
        ])
      ),
    [categories]
  )

  const getCategoryName = (categoryId) =>
    categoryNameById.get(String(categoryId)) || '—'

  const categoryOptions = useMemo(
    () =>
      [...categories]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map((category) => ({
          value: String(category.category_id),
          label: category.name,
        })),
    [categories]
  )

  const categoryFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All categories' },
      ...categoryOptions,
    ],
    [categoryOptions]
  )

  // -------------------------------------------------------
  // Modal actions
  // -------------------------------------------------------

  const openCreate = () => {
    setFormError('')
    setActionError('')
    setModal({
      open: true,
      mode: 'create',
      editingId: null,
      initialForm: { ...emptyForm },
    })
  }

  const openEdit = (item) => {
    setFormError('')
    setActionError('')
    setModal({
      open: true,
      mode: 'edit',
      editingId: item.medicine_id,
      initialForm: {
        category_id: item.category_id
          ? String(item.category_id)
          : '',
        generic_name: item.generic_name || '',
        brand_name: item.brand_name || '',
        ...splitDosage(item.dosage, item.dosage_unit),
        description: item.description || '',
        requires_prescription: Boolean(item.requires_prescription),
      },
    })
  }

  const closeModal = () => {
    if (isSaving) return

    setModal((current) => ({ ...current, open: false }))
    setFormError('')
  }

  const handleSave = async (payload) => {
    const isEdit = modal.mode === 'edit'

    setIsSaving(true)
    setFormError('')

    try {
      const response = await apiRequest(
        isEdit ? `/medicines/${modal.editingId}` : '/medicines',
        {
          token: accessToken,
          method: isEdit ? 'PATCH' : 'POST',
          body: payload,
        }
      )

      setNotice(
        response?.message ||
          (isEdit ? 'Medicine updated.' : 'Medicine added.')
      )

      setModal((current) => ({ ...current, open: false }))
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setFormError(
        requestError.message || 'Unable to save this medicine.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deactivateItem = async (item) => {
    const name = item.brand_name
      ? `${item.generic_name} (${item.brand_name})`
      : item.generic_name

    if (
      !window.confirm(
        `Deactivate ${name}? Customers will no longer see it.`
      )
    ) {
      return
    }

    setActionError('')
    setNotice('')

    try {
      const response = await apiRequest(
        `/medicines/${item.medicine_id}`,
        {
          token: accessToken,
          method: 'DELETE',
        }
      )

      setNotice(response?.message || 'Medicine deactivated.')
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setActionError(
        requestError.message || 'Unable to deactivate medicine.'
      )
    }
  }

  // -------------------------------------------------------
  // Filtering
  // -------------------------------------------------------

  const hasFilters =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    prescriptionFilter !== 'ALL'

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setPrescriptionFilter('ALL')
  }

  const filteredMedicines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return medicines.filter((medicine) => {
      if (term) {
        const haystack = [
          medicine.generic_name,
          medicine.brand_name,
          categoryNameById.get(String(medicine.category_id)),
          formatDosage(medicine),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(term)) return false
      }

      if (
        categoryFilter !== 'ALL' &&
        String(medicine.category_id) !== categoryFilter
      ) {
        return false
      }

      if (
        statusFilter !== 'ALL' &&
        medicine.status !== statusFilter
      ) {
        return false
      }

      if (prescriptionFilter !== 'ALL') {
        const needsRx = prescriptionFilter === 'YES'

        if (Boolean(medicine.requires_prescription) !== needsRx) {
          return false
        }
      }

      return true
    })
  }, [
    medicines,
    searchTerm,
    categoryFilter,
    statusFilter,
    prescriptionFilter,
    categoryNameById,
  ])

  // -------------------------------------------------------
  // Pagination
  // -------------------------------------------------------

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, statusFilter, prescriptionFilter])

  const totalPages = Math.max(
    Math.ceil(filteredMedicines.length / ITEMS_PER_PAGE),
    1
  )

  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE

  const paginatedMedicines = filteredMedicines.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter(
    (number) =>
      number === 1 ||
      number === totalPages ||
      Math.abs(number - page) <= 1
  )

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <>
      <div className="page-header-sticky">
        <div className="med-header">
          <div>
            <h2 className="page-title">Medicines</h2>
            <p className="page-copy">
              Manage your pharmacy&apos;s medicine catalog.
            </p>
          </div>

          <button
            type="button"
            className="med-btn med-btn-primary"
            onClick={openCreate}
          >
            <PlusIcon />
            Add medicine
          </button>
        </div>
      </div>

      <div className="page-content-wrapper">
        <section className="med-page">
          {loadError && (
            <p className="med-banner med-banner-error" role="alert">
              {loadError}
            </p>
          )}

          {actionError && (
            <p className="med-banner med-banner-error" role="alert">
              {actionError}
              <button
                type="button"
                className="med-banner-close"
                onClick={() => setActionError('')}
                aria-label="Dismiss"
              >
                <CloseIcon />
              </button>
            </p>
          )}

          {notice && (
            <p className="med-banner med-banner-success" role="status">
              {notice}
              <button
                type="button"
                className="med-banner-close"
                onClick={() => setNotice('')}
                aria-label="Dismiss"
              >
                <CloseIcon />
              </button>
            </p>
          )}

          <div className="med-card">
            {/* Toolbar */}
            <div className="med-toolbar">
              <div className="med-search">
                <SearchIcon />

                <input
                  type="search"
                  placeholder="Search name, brand, category or dosage…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search medicines"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="med-search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>

              <Select
                size="sm"
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryFilterOptions}
              />

              <Select
                size="sm"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
              />

              <Select
                size="sm"
                aria-label="Filter by prescription"
                value={prescriptionFilter}
                onChange={setPrescriptionFilter}
                options={PRESCRIPTION_OPTIONS}
              />
            </div>

            {/* Summary */}
            {!isLoading && medicines.length > 0 && (
              <div className="med-summary">
                <span>
                  {filteredMedicines.length === 0
                    ? 'No medicines match'
                    : `Showing ${startIndex + 1}–${Math.min(
                        startIndex + ITEMS_PER_PAGE,
                        filteredMedicines.length
                      )} of ${filteredMedicines.length} medicine${
                        filteredMedicines.length === 1 ? '' : 's'
                      }`}
                  {hasFilters &&
                    ` · filtered from ${medicines.length}`}
                </span>

                {hasFilters && (
                  <button
                    type="button"
                    className="med-link-btn"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Table / states */}
            {isLoading ? (
              <div className="med-state">
                <p>Loading medicines…</p>
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="med-state">
                <h3>
                  {hasFilters
                    ? 'No matching medicines'
                    : 'No medicines yet'}
                </h3>

                <p>
                  {hasFilters
                    ? 'Try a different search or clear the filters.'
                    : 'Add your first medicine to start building your catalog.'}
                </p>

                {hasFilters ? (
                  <button
                    type="button"
                    className="med-btn med-btn-secondary"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="med-btn med-btn-primary"
                    onClick={openCreate}
                  >
                    <PlusIcon />
                    Add medicine
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="med-table-scroll">
                  <table className="med-table">
                    <thead>
                      <tr>
                        <th scope="col">Medicine</th>
                        <th scope="col">Category</th>
                        <th scope="col">Dosage</th>
                        <th scope="col">Prescription</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="med-col-actions">
                          <span className="med-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedMedicines.map((item) => {
                        const isActive = item.status === 'ACTIVE'

                        return (
                          <tr
                            key={item.medicine_id}
                            className={isActive ? '' : 'is-inactive'}
                          >
                            <td>
                              <div className="med-name">
                                <strong>{item.generic_name}</strong>
                                {item.brand_name && (
                                  <span>{item.brand_name}</span>
                                )}
                              </div>
                            </td>

                            <td>{getCategoryName(item.category_id)}</td>

                            <td className="med-nowrap">
                              {formatDosage(item)}
                            </td>

                            <td>
                              {item.requires_prescription ? (
                                <span className="med-pill med-pill-rx">
                                  Rx required
                                </span>
                              ) : (
                                <span className="med-muted">
                                  Not required
                                </span>
                              )}
                            </td>

                            <td>
                              <span
                                className={`med-pill ${
                                  isActive
                                    ? 'med-pill-active'
                                    : 'med-pill-inactive'
                                }`}
                              >
                                {formatStatus(item.status)}
                              </span>
                            </td>

                            <td className="med-col-actions">
                              <div className="med-actions">
                                <button
                                  type="button"
                                  className="med-action"
                                  onClick={() => openEdit(item)}
                                  aria-label={`Edit ${item.generic_name}`}
                                >
                                  Edit
                                </button>

                                {isActive && (
                                  <button
                                    type="button"
                                    className="med-action med-action-danger"
                                    onClick={() => deactivateItem(item)}
                                    aria-label={`Deactivate ${item.generic_name}`}
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <nav
                    className="med-pagination"
                    aria-label="Medicines pages"
                  >
                    <span>
                      Page {page} of {totalPages}
                    </span>

                    <div className="med-pages">
                      <button
                        type="button"
                        className="med-page-btn"
                        onClick={() => setCurrentPage(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeftIcon />
                      </button>

                      {pageNumbers.map((number, index) => (
                        <span key={number} className="med-page-group">
                          {index > 0 &&
                            number - pageNumbers[index - 1] > 1 && (
                              <span className="med-ellipsis">…</span>
                            )}

                          <button
                            type="button"
                            className={`med-page-btn${
                              number === page ? ' is-current' : ''
                            }`}
                            onClick={() => setCurrentPage(number)}
                            aria-current={
                              number === page ? 'page' : undefined
                            }
                          >
                            {number}
                          </button>
                        </span>
                      ))}

                      <button
                        type="button"
                        className="med-page-btn"
                        onClick={() => setCurrentPage(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <MedicineFormModal
        open={modal.open}
        mode={modal.mode}
        initialForm={modal.initialForm}
        categoryOptions={categoryOptions}
        isSaving={isSaving}
        serverError={formError}
        onClose={closeModal}
        onSubmit={handleSave}
      />
    </>
  )
}

export default MedicinesPage