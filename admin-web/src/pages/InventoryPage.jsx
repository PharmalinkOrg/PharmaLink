// File: admin-web/src/pages/InventoryPage.jsx
//
// Full-width inventory (batch) table with search + filters.
// Add / Edit happen in a modal opened from the header button
// or a row's Edit action.
//
// Shares table, button, banner and modal styles (med-*) with
// the Medicines page, plus a few inventory-only styles (inv-*).

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import Select from '../components/ui/Select'

import './MedicinesPage.css'
import './InventoryPage.css'

// =========================================================
// CONSTANTS
// =========================================================

const ITEMS_PER_PAGE = 15
const EXPIRY_WARNING_DAYS = 60

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
]

const emptyForm = {
  medicine_id: '',
  batch_number: '',
  quantity: '',
  reorder_level: '',
  unit_price: '',
  expiration_date: '',
}

// =========================================================
// HELPERS
// =========================================================

/** "500 mg"; avoids "500mg mg" for older records. */
function formatDosage(medicine) {
  const text = String(medicine?.dosage ?? '').trim()

  if (!text) return ''

  const unit = medicine?.dosage_unit

  if (!unit || /[a-z%]/i.test(text)) return text

  return `${text} ${unit}`
}

function formatPeso(amount) {
  const number = Number(amount)

  if (!Number.isFinite(number)) return '—'

  return `₱${number.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Days until expiry (negative = expired) and a display date. */
function getExpiryInfo(value) {
  if (!value) return null

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)

  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    days: Math.round((date - today) / 86400000),
    label: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }
}

function getStatusPill(status) {
  switch (status) {
    case 'AVAILABLE':
      return { className: 'med-pill-active', label: 'Available' }
    case 'LOW_STOCK':
      return { className: 'inv-pill-low', label: 'Low stock' }
    case 'OUT_OF_STOCK':
      return { className: 'inv-pill-out', label: 'Out of stock' }
    default: {
      const text = String(status || 'Unknown')
        .replaceAll('_', ' ')
        .toLowerCase()

      return {
        className: 'med-pill-inactive',
        label: text.charAt(0).toUpperCase() + text.slice(1),
      }
    }
  }
}

function isWholeNumber(value) {
  const text = String(value ?? '').trim()

  return /^\d+$/.test(text)
}

function isMoney(value) {
  const text = String(value ?? '').trim()

  if (text === '') return false

  const number = Number(text)

  return Number.isFinite(number) && number >= 0
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

function InventoryFormModal({
  open,
  mode,
  initialForm,
  medicineOptions,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  const panelRef = useRef(null)
  const firstFieldRef = useRef(null)

  const isSavingRef = useRef(isSaving)
  const onCloseRef = useRef(onClose)
  isSavingRef.current = isSaving
  onCloseRef.current = onClose

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
      // Medicine picker on create, batch number on edit
      const target =
        mode === 'edit'
          ? firstFieldRef.current
          : panelRef.current?.querySelector('#inv-medicine')

      target?.focus()
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
  }, [open, mode])

  if (!open) return null

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const handleInput = (event) => {
    setField(event.target.name, event.target.value)
  }

  const validate = (values) => {
    const next = {}

    if (!values.medicine_id) {
      next.medicine_id = 'Choose a medicine.'
    }

    if (!values.batch_number.trim()) {
      next.batch_number = 'Enter the batch number.'
    }

    if (!isWholeNumber(values.quantity)) {
      next.quantity = 'Enter a whole number (0 or more).'
    }

    if (!isWholeNumber(values.reorder_level)) {
      next.reorder_level = 'Enter a whole number (0 or more).'
    }

    if (!isMoney(values.unit_price)) {
      next.unit_price = 'Enter a price of 0 or more.'
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
      batch_number: form.batch_number.trim(),
      quantity: String(form.quantity).trim(),
      reorder_level: String(form.reorder_level).trim(),
      unit_price: String(form.unit_price).trim(),
    })
  }

  const isEdit = mode === 'edit'
  const noMedicines = medicineOptions.length === 0

  const expiry = getExpiryInfo(form.expiration_date)
  const expiryWarning =
    expiry && expiry.days < 0
      ? 'This date has already passed. The batch will be recorded as expired stock.'
      : null

  const fieldProps = (name, describedBy) => ({
    id: `inv-${name.replaceAll('_', '-')}`,
    name,
    value: form[name],
    onChange: handleInput,
    className: `med-input${errors[name] ? ' is-invalid' : ''}`,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby':
      [errors[name] ? `inv-${name}-error` : null, describedBy]
        .filter(Boolean)
        .join(' ') || undefined,
  })

  const fieldError = (name) =>
    errors[name] ? (
      <p id={`inv-${name}-error`} className="med-field-error">
        {errors[name]}
      </p>
    ) : null

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
        aria-labelledby="inv-modal-title"
      >
        <header className="med-modal-header">
          <div>
            <h3 id="inv-modal-title">
              {isEdit ? 'Edit batch' : 'Add inventory batch'}
            </h3>
            <p>
              {isEdit
                ? 'Update stock, price or expiry for this batch.'
                : 'Record a new batch of stock for a medicine in your catalog.'}
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

            {noMedicines && (
              <p className="med-banner med-banner-warning med-field-full">
                No medicines in your catalog yet. Add one on the
                Medicines page first.
              </p>
            )}

            {/* Medicine */}
            <div className="med-field med-field-full">
              <label
                className="med-label"
                id="inv-medicine-label"
                htmlFor="inv-medicine"
              >
                Medicine
                <span className="med-req" aria-hidden="true">*</span>
              </label>

              <Select
                id="inv-medicine"
                searchable
                searchPlaceholder="Search by name, brand or dosage…"
                emptyText="No medicines match"
                aria-labelledby="inv-medicine-label"
                aria-describedby={
                  errors.medicine_id
                    ? 'inv-medicine_id-error'
                    : undefined
                }
                value={form.medicine_id}
                onChange={(value) =>
                  setField('medicine_id', String(value))
                }
                options={medicineOptions}
                placeholder="Select a medicine"
                invalid={Boolean(errors.medicine_id)}
                disabled={noMedicines}
              />

              {fieldError('medicine_id')}
            </div>

            {/* Batch number */}
            <div className="med-field">
              <label className="med-label" htmlFor="inv-batch-number">
                Batch number
                <span className="med-req" aria-hidden="true">*</span>
              </label>

              <input
                ref={firstFieldRef}
                {...fieldProps('batch_number')}
                placeholder="e.g., BN-2026-0412"
                autoComplete="off"
                required
              />

              {fieldError('batch_number')}
            </div>

            {/* Expiry */}
            <div className="med-field">
              <label
                className="med-label"
                htmlFor="inv-expiration-date"
              >
                Expiry date
                <span className="med-optional">Optional</span>
              </label>

              <input
                {...fieldProps(
                  'expiration_date',
                  expiryWarning ? 'inv-expiry-warning' : undefined
                )}
                type="date"
              />

              {expiryWarning && (
                <p id="inv-expiry-warning" className="inv-warning">
                  {expiryWarning}
                </p>
              )}
            </div>

            {/* Quantity / reorder / price */}
            <div className="inv-qty-row med-field-full">
              <div className="med-field">
                <label className="med-label" htmlFor="inv-quantity">
                  Quantity
                  <span className="med-req" aria-hidden="true">*</span>
                </label>

                <input
                  {...fieldProps('quantity')}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  required
                />

                {fieldError('quantity')}
              </div>

              <div className="med-field">
                <label
                  className="med-label"
                  htmlFor="inv-reorder-level"
                >
                  Reorder level
                  <span className="med-req" aria-hidden="true">*</span>
                </label>

                <input
                  {...fieldProps(
                    'reorder_level',
                    'inv-reorder-hint'
                  )}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  required
                />

                {fieldError('reorder_level') || (
                  <p id="inv-reorder-hint" className="inv-hint">
                    Shown as low stock at or below this.
                  </p>
                )}
              </div>

              <div className="med-field">
                <label className="med-label" htmlFor="inv-unit-price">
                  Unit price
                  <span className="med-req" aria-hidden="true">*</span>
                </label>

                <div className="inv-money">
                  <span aria-hidden="true">₱</span>

                  <input
                    {...fieldProps('unit_price')}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                  />
                </div>

                {fieldError('unit_price')}
              </div>
            </div>
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
              disabled={isSaving || noMedicines}
            >
              {isSaving
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add batch'}
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

function InventoryPage() {
  const { accessToken, user } = useAuth()

  const [inventory, setInventory] = useState([])
  const [medicines, setMedicines] = useState([])

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
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [medicineFilter, setMedicineFilter] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const pharmacyId = user?.pharmacy_id
  const inventoryPath = `/pharmacies/${pharmacyId}/inventory`

  // -------------------------------------------------------
  // Load data
  // -------------------------------------------------------

  useEffect(() => {
    if (!accessToken || !pharmacyId) return undefined

    let isCurrent = true

    apiRequest(inventoryPath, { token: accessToken })
      .then((response) => {
        if (isCurrent) {
          setInventory(
            Array.isArray(response?.data) ? response.data : []
          )
          setLoadError('')
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setLoadError(
            requestError.message || 'Unable to load inventory.'
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, pharmacyId, inventoryPath, refreshKey])

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
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setLoadError(
            requestError.message || 'Unable to load medicines.'
          )
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, pharmacyId])

  // Auto-hide success messages
  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => setNotice(''), 5000)

    return () => window.clearTimeout(timer)
  }, [notice])

  // -------------------------------------------------------
  // Medicines lookup + dropdown options
  // -------------------------------------------------------

  const medicineById = useMemo(
    () =>
      new Map(
        medicines.map((medicine) => [
          String(medicine.medicine_id),
          medicine,
        ])
      ),
    [medicines]
  )

  const sortedMedicines = useMemo(
    () =>
      [...medicines].sort((a, b) =>
        String(a.generic_name || a.brand_name || '').localeCompare(
          String(b.generic_name || b.brand_name || '')
        )
      ),
    [medicines]
  )

  const toOption = (medicine) => {
    const name = medicine.generic_name || medicine.brand_name

    const label =
      medicine.brand_name &&
      medicine.generic_name &&
      medicine.brand_name !== medicine.generic_name
        ? `${medicine.generic_name} (${medicine.brand_name})`
        : name || `Medicine #${medicine.medicine_id}`

    const description = [
      formatDosage(medicine),
      medicine.status && medicine.status !== 'ACTIVE'
        ? 'Inactive'
        : null,
    ]
      .filter(Boolean)
      .join(' · ')

    return {
      value: String(medicine.medicine_id),
      label,
      description: description || undefined,
    }
  }

  // In the form: active medicines, plus the current one when editing
  const formMedicineOptions = useMemo(() => {
    const currentId = modal.open ? modal.initialForm.medicine_id : ''

    return sortedMedicines
      .filter(
        (medicine) =>
          medicine.status === 'ACTIVE' ||
          !medicine.status ||
          String(medicine.medicine_id) === currentId
      )
      .map(toOption)
    // toOption only depends on its argument
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMedicines, modal.open, modal.initialForm])

  const medicineFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All medicines' },
      ...sortedMedicines.map(toOption),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedMedicines]
  )

  const getMedicine = (medicineId) =>
    medicineById.get(String(medicineId)) || null

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
      editingId: item.inventory_id,
      initialForm: {
        medicine_id: String(item.medicine_id ?? ''),
        batch_number: item.batch_number || '',
        quantity: String(item.quantity ?? ''),
        reorder_level: String(item.reorder_level ?? ''),
        unit_price: String(item.unit_price ?? ''),
        expiration_date: item.expiration_date
          ? String(item.expiration_date).slice(0, 10)
          : '',
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
        isEdit
          ? `${inventoryPath}/${modal.editingId}`
          : inventoryPath,
        {
          token: accessToken,
          method: isEdit ? 'PATCH' : 'POST',
          body: payload,
        }
      )

      setNotice(
        response?.message ||
          (isEdit ? 'Batch updated.' : 'Batch added.')
      )

      setModal((current) => ({ ...current, open: false }))
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setFormError(
        requestError.message || 'Unable to save this batch.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteItem = async (item) => {
    const medicine = getMedicine(item.medicine_id)
    const name =
      medicine?.generic_name || medicine?.brand_name || 'this medicine'

    if (
      !window.confirm(
        `Delete batch ${item.batch_number} of ${name}? This can't be undone.`
      )
    ) {
      return
    }

    setActionError('')
    setNotice('')

    try {
      const response = await apiRequest(
        `${inventoryPath}/${item.inventory_id}`,
        {
          token: accessToken,
          method: 'DELETE',
        }
      )

      setNotice(response?.message || 'Batch deleted.')
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setActionError(
        requestError.message || 'Unable to delete batch.'
      )
    }
  }

  // -------------------------------------------------------
  // Filtering
  // -------------------------------------------------------

  const hasFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    medicineFilter !== 'ALL'

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setMedicineFilter('ALL')
  }

  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return inventory.filter((item) => {
      if (term) {
        const medicine = medicineById.get(String(item.medicine_id))

        const haystack = [
          medicine?.generic_name,
          medicine?.brand_name,
          formatDosage(medicine),
          item.batch_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(term)) return false
      }

      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      if (
        medicineFilter !== 'ALL' &&
        String(item.medicine_id) !== medicineFilter
      ) {
        return false
      }

      return true
    })
  }, [inventory, searchTerm, statusFilter, medicineFilter, medicineById])

  // -------------------------------------------------------
  // Pagination
  // -------------------------------------------------------

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, medicineFilter])

  const totalPages = Math.max(
    Math.ceil(filteredInventory.length / ITEMS_PER_PAGE),
    1
  )

  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE

  const paginatedInventory = filteredInventory.slice(
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
            <h2 className="page-title">Inventory</h2>
            <p className="page-copy">
              Manage stock batches for your pharmacy.
            </p>
          </div>

          <button
            type="button"
            className="med-btn med-btn-primary"
            onClick={openCreate}
          >
            <PlusIcon />
            Add batch
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
            <div className="med-toolbar inv-toolbar">
              <div className="med-search">
                <SearchIcon />

                <input
                  type="search"
                  placeholder="Search medicine, brand or batch number…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search inventory"
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
                searchable
                searchPlaceholder="Search medicines…"
                emptyText="No medicines match"
                aria-label="Filter by medicine"
                value={medicineFilter}
                onChange={setMedicineFilter}
                options={medicineFilterOptions}
              />

              <Select
                size="sm"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
              />
            </div>

            {/* Summary */}
            {!isLoading && inventory.length > 0 && (
              <div className="med-summary">
                <span>
                  {filteredInventory.length === 0
                    ? 'No batches match'
                    : `Showing ${startIndex + 1}–${Math.min(
                        startIndex + ITEMS_PER_PAGE,
                        filteredInventory.length
                      )} of ${filteredInventory.length} batch${
                        filteredInventory.length === 1 ? '' : 'es'
                      }`}
                  {hasFilters && ` · filtered from ${inventory.length}`}
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
                <p>Loading inventory…</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="med-state">
                <h3>
                  {hasFilters
                    ? 'No matching batches'
                    : 'No inventory batches yet'}
                </h3>

                <p>
                  {hasFilters
                    ? 'Try a different search or clear the filters.'
                    : medicines.length === 0
                      ? 'Add medicines to your catalog first, then record their stock here.'
                      : 'Add your first batch to show customers what you have in stock.'}
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
                  medicines.length > 0 && (
                    <button
                      type="button"
                      className="med-btn med-btn-primary"
                      onClick={openCreate}
                    >
                      <PlusIcon />
                      Add batch
                    </button>
                  )
                )}
              </div>
            ) : (
              <>
                <div className="med-table-scroll">
                  <table className="med-table">
                    <thead>
                      <tr>
                        <th scope="col">Medicine</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Stock</th>
                        <th scope="col">Unit price</th>
                        <th scope="col">Expiry</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="med-col-actions">
                          <span className="med-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedInventory.map((item) => {
                        const medicine = getMedicine(item.medicine_id)
                        const status = getStatusPill(item.status)
                        const expiry = getExpiryInfo(item.expiration_date)

                        const subtitle = [
                          medicine?.brand_name &&
                          medicine.brand_name !== medicine.generic_name
                            ? medicine.brand_name
                            : null,
                          formatDosage(medicine),
                        ]
                          .filter(Boolean)
                          .join(' · ')

                        return (
                          <tr key={item.inventory_id}>
                            <td>
                              <div className="med-name">
                                <strong>
                                  {medicine?.generic_name ||
                                    medicine?.brand_name ||
                                    `Medicine #${item.medicine_id}`}
                                </strong>
                                {subtitle && <span>{subtitle}</span>}
                              </div>
                            </td>

                            <td>
                              <span className="inv-batch">
                                {item.batch_number || '—'}
                              </span>
                            </td>

                            <td>
                              <div className="inv-stock">
                                <strong>
                                  {Number(item.quantity ?? 0).toLocaleString(
                                    'en-US'
                                  )}
                                </strong>

                                {item.reorder_level !== null &&
                                  item.reorder_level !== undefined && (
                                    <span>
                                      Reorder at {item.reorder_level}
                                    </span>
                                  )}
                              </div>
                            </td>

                            <td className="med-nowrap">
                              {formatPeso(item.unit_price)}
                            </td>

                            <td>
                              {expiry ? (
                                <div className="inv-expiry">
                                  <span>{expiry.label}</span>

                                  {expiry.days < 0 ? (
                                    <span className="inv-tag inv-tag-expired">
                                      Expired
                                    </span>
                                  ) : expiry.days === 0 ? (
                                    <span className="inv-tag inv-tag-expired">
                                      Expires today
                                    </span>
                                  ) : expiry.days <= EXPIRY_WARNING_DAYS ? (
                                    <span className="inv-tag inv-tag-soon">
                                      In {expiry.days} day
                                      {expiry.days === 1 ? '' : 's'}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="med-muted">—</span>
                              )}
                            </td>

                            <td>
                              <span className={`med-pill ${status.className}`}>
                                {status.label}
                              </span>
                            </td>

                            <td className="med-col-actions">
                              <div className="med-actions">
                                <button
                                  type="button"
                                  className="med-action"
                                  onClick={() => openEdit(item)}
                                  aria-label={`Edit batch ${item.batch_number}`}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="med-action med-action-danger"
                                  onClick={() => deleteItem(item)}
                                  aria-label={`Delete batch ${item.batch_number}`}
                                >
                                  Delete
                                </button>
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
                    aria-label="Inventory pages"
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

      <InventoryFormModal
        open={modal.open}
        mode={modal.mode}
        initialForm={modal.initialForm}
        medicineOptions={formMedicineOptions}
        isSaving={isSaving}
        serverError={formError}
        onClose={closeModal}
        onSubmit={handleSave}
      />
    </>
  )
}

export default InventoryPage