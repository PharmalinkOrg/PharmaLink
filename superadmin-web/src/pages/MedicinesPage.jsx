// File: superadmin-web/src/pages/MedicinesPage.jsx
//
// Global medicine catalog. Pharmacies list these medicines in
// their own inventories with their own stock and prices.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  CheckCircle2,
  FileWarning,
  Filter,
  FolderOpen,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Store,
  Tag,
  Trash2,
  X,
} from 'lucide-react'

import ConfirmActionDialog from '../components/common/ConfirmActionDialog'
import {
  DOSAGE_FORMS,
  createMedicine,
  createMedicineCategory,
  deleteMedicineCategory,
  getMedicineCategories,
  getMedicines,
  setMedicineArchived,
  updateMedicine,
  updateMedicineCategory,
} from '../services/medicineService'

import './MedicinesPage.css'

/* ============================================================
   CONSTANTS + HELPERS
============================================================ */

const MEDICINES_PER_PAGE = 10

const EMPTY_MEDICINE = {
  genericName: '',
  brandName: '',
  dosage: '',
  form: '',
  categoryId: '',
  requiresPrescription: false,
  description: '',
}

const EMPTY_CATEGORY = { name: '', description: '' }

const normalizeText = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const medicineKey = (medicine) =>
  [medicine.genericName, medicine.brandName, medicine.dosage, medicine.form]
    .map(normalizeText)
    .join('|')

const medicineLabel = (medicine) =>
  [medicine.brandName || medicine.genericName, medicine.dosage].filter(Boolean).join(' ')

/* ============================================================
   MODAL SHELL
============================================================ */

function Modal({ title, subtitle, icon: Icon, onClose, submitting, children }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  return (
    <div
      className="pharmacy-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose()
        }
      }}
    >
      <div className="pharmacy-modal" role="dialog" aria-modal="true" aria-labelledby="medicine-modal-title">
        <div className="pharmacy-modal-header">
          <div className="modal-title-row">
            <div className="modal-title-icon">
              <Icon size={20} />
            </div>

            <div>
              <h2 id="medicine-modal-title">{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

/* ============================================================
   MEDICINE FORM MODAL
============================================================ */

function MedicineFormModal({ medicine, categories, existingMedicines, onClose, onSaved }) {
  const isEditing = Boolean(medicine)

  const [form, setForm] = useState(() =>
    medicine
      ? {
          genericName: medicine.genericName,
          brandName: medicine.brandName,
          dosage: medicine.dosage,
          form: medicine.form,
          categoryId: medicine.categoryId ? String(medicine.categoryId) : '',
          requiresPrescription: medicine.requiresPrescription,
          description: medicine.description,
        }
      : { ...EMPTY_MEDICINE }
  )

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const validate = () => {
    if (!form.genericName.trim()) {
      return 'Generic name is required.'
    }

    if (!form.dosage.trim()) {
      return 'Dosage / strength is required (e.g. 500 mg).'
    }

    if (!/\d/.test(form.dosage)) {
      return 'Dosage should include an amount, e.g. 500 mg or 5 mg/5 mL.'
    }

    if (!form.form) {
      return 'Select the dosage form.'
    }

    if (!form.categoryId) {
      return 'Select a category.'
    }

    // Only catalog medicines must be unique; pharmacies may have
    // their own copies of the same product.
    const editingCatalog = !medicine || medicine.isCatalog
    const key = medicineKey(form)
    const duplicate = editingCatalog
      ? existingMedicines.find(
          (item) => item.isCatalog && item.id !== medicine?.id && medicineKey(item) === key
        )
      : null

    if (duplicate) {
      return `${medicineLabel(duplicate)} (${duplicate.form}) is already in the catalog${
        duplicate.isArchived ? ' as an archived medicine. Restore it instead.' : '.'
      }`
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)

      const saved = isEditing
        ? await updateMedicine(medicine.id, form)
        : await createMedicine(form)

      onSaved(saved, form)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this medicine.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edit Medicine' : 'Add Medicine'}
      subtitle={
        !isEditing
          ? 'Add a standardized medicine that pharmacies can list in their inventory.'
          : medicine.isCatalog
            ? 'Changes apply to every pharmacy that lists this medicine.'
            : `This medicine was added by ${medicine.pharmacyName || 'a pharmacy'}.`
      }
      icon={Pill}
      onClose={onClose}
      submitting={submitting}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="pharmacy-form-content">
          <div className="pharmacy-form-grid">
            <div className="form-group">
              <label htmlFor="medicine-generic">
                Generic Name
                <span>*</span>
              </label>
              <input
                id="medicine-generic"
                value={form.genericName}
                onChange={(event) => update('genericName', event.target.value)}
                placeholder="e.g. Paracetamol"
                maxLength={120}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicine-brand">Brand Name</label>
              <input
                id="medicine-brand"
                value={form.brandName}
                onChange={(event) => update('brandName', event.target.value)}
                placeholder="e.g. Biogesic"
                maxLength={120}
              />
              <small>Leave empty for unbranded / generic products.</small>
            </div>

            <div className="form-group">
              <label htmlFor="medicine-dosage">
                Dosage / Strength
                <span>*</span>
              </label>
              <input
                id="medicine-dosage"
                value={form.dosage}
                onChange={(event) => update('dosage', event.target.value)}
                placeholder="e.g. 500 mg"
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicine-form">
                Dosage Form
                <span>*</span>
              </label>
              <select
                id="medicine-form"
                className="form-select"
                value={form.form}
                onChange={(event) => update('form', event.target.value)}
              >
                <option value="">Select form</option>
                {DOSAGE_FORMS.map((dosageForm) => (
                  <option key={dosageForm} value={dosageForm}>
                    {dosageForm}
                  </option>
                ))}
                {form.form && !DOSAGE_FORMS.includes(form.form) && (
                  <option value={form.form}>{form.form}</option>
                )}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="medicine-category">
                Category
                <span>*</span>
              </label>
              <select
                id="medicine-category"
                className="form-select"
                value={form.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <small>No categories yet. Add one in the Categories tab first.</small>
              )}
            </div>

            <div className="form-group full-width">
              <label className="medicine-checkbox">
                <input
                  type="checkbox"
                  checked={form.requiresPrescription}
                  onChange={(event) => update('requiresPrescription', event.target.checked)}
                />
                <span>
                  <strong>Requires prescription (Rx)</strong>
                  <small>
                    Customers must upload a prescription that the pharmacy verifies
                    before reserving.
                  </small>
                </span>
              </label>
            </div>

            <div className="form-group full-width">
              <label htmlFor="medicine-description">Basic Information</label>
              <textarea
                id="medicine-description"
                rows={3}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Short, factual description shown to customers (e.g. what it is commonly used for)."
                maxLength={1000}
              />
              <small>
                Informational only — not medical advice. {form.description.length}/1000
              </small>
            </div>
          </div>
        </div>

        {error && (
          <div className="form-error-message" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="pharmacy-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ============================================================
   CATEGORY FORM MODAL
============================================================ */

function CategoryFormModal({ category, categories, onClose, onSaved }) {
  const isEditing = Boolean(category)

  const [form, setForm] = useState(() =>
    category ? { name: category.name, description: category.description } : { ...EMPTY_CATEGORY }
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = form.name.trim()

    if (!name) {
      setError('Category name is required.')
      return
    }

    if (
      categories.some(
        (item) => item.id !== category?.id && normalizeText(item.name) === normalizeText(name)
      )
    ) {
      setError('A category with this name already exists.')
      return
    }

    try {
      setSubmitting(true)

      const saved = isEditing
        ? await updateMedicineCategory(category.id, form)
        : await createMedicineCategory(form)

      onSaved(saved, form)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this category.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edit Category' : 'Add Category'}
      subtitle="Categories help customers browse medicines (e.g. Pain Relief, Vitamins)."
      icon={Tag}
      onClose={onClose}
      submitting={submitting}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="pharmacy-form-content">
          <div className="pharmacy-form-grid">
            <div className="form-group full-width">
              <label htmlFor="category-name">
                Name
                <span>*</span>
              </label>
              <input
                id="category-name"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }))
                  setError('')
                }}
                placeholder="e.g. Cough & Cold"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="category-description">Description</label>
              <textarea
                id="category-description"
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                maxLength={300}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="form-error-message" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="pharmacy-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ============================================================
   PAGE
============================================================ */

export function MedicinesPage() {
  const [tab, setTab] = useState('medicines')

  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sort, setSort] = useState('az')
  const [currentPage, setCurrentPage] = useState(1)

  const [notice, setNotice] = useState('')

  // { type: 'medicine' | 'category', item | null }
  const [editor, setEditor] = useState(null)

  // { type: 'archive' | 'restore' | 'delete-category', item }
  const [pendingAction, setPendingAction] = useState(null)

  /* ==========================================================
     LOAD
  ========================================================== */

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [medicineData, categoryData] = await Promise.all([
        getMedicines(),
        getMedicineCategories(),
      ])

      setMedicines(medicineData)
      setCategories(categoryData)
    } catch (loadError) {
      console.error('Failed to load medicine catalog:', loadError)
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  )

  const getCategoryName = useCallback(
    (medicine) =>
      categoryMap.get(String(medicine.categoryId))?.name || medicine.categoryName || 'Uncategorized',
    [categoryMap]
  )

  // Live medicine counts per category (from the loaded catalog).
  const categoryCounts = useMemo(() => {
    const counts = new Map()

    medicines.forEach((medicine) => {
      const key = String(medicine.categoryId)
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    return counts
  }, [medicines])

  const activeCount = medicines.filter((medicine) => !medicine.isArchived).length
  const catalogCount = medicines.filter((m) => !m.isArchived && m.isCatalog).length
  const rxCount = medicines.filter((m) => !m.isArchived && m.requiresPrescription).length

  const filteredMedicines = useMemo(() => {
    const tokens = normalizeText(search).split(' ').filter(Boolean)

    const filtered = medicines.filter((medicine) => {
      if (statusFilter === 'active' && medicine.isArchived) return false
      if (statusFilter === 'archived' && !medicine.isArchived) return false
      if (typeFilter === 'rx' && !medicine.requiresPrescription) return false
      if (typeFilter === 'otc' && medicine.requiresPrescription) return false
      if (sourceFilter === 'catalog' && !medicine.isCatalog) return false
      if (sourceFilter === 'pharmacy' && medicine.isCatalog) return false

      if (categoryFilter !== 'all' && String(medicine.categoryId) !== categoryFilter) {
        return false
      }

      if (tokens.length === 0) return true

      const haystack = normalizeText(
        [
          medicine.genericName,
          medicine.brandName,
          medicine.dosage,
          medicine.form,
          getCategoryName(medicine),
          medicine.pharmacyName,
          medicine.requiresPrescription ? 'rx prescription' : 'otc',
        ].join(' ')
      )

      return tokens.every((token) => haystack.includes(token))
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') {
        return (
          (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0) ||
          (Number(b.id) || 0) - (Number(a.id) || 0)
        )
      }

      if (sort === 'category') {
        return (
          getCategoryName(a).localeCompare(getCategoryName(b)) ||
          a.genericName.localeCompare(b.genericName)
        )
      }

      return (
        a.genericName.localeCompare(b.genericName, undefined, { sensitivity: 'base' }) ||
        a.brandName.localeCompare(b.brandName) ||
        a.dosage.localeCompare(b.dosage, undefined, { numeric: true })
      )
    })
  }, [medicines, search, statusFilter, typeFilter, sourceFilter, categoryFilter, sort, getCategoryName])

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'active' ? 1 : 0)

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setTypeFilter('all')
    setSourceFilter('all')
    setStatusFilter('active')
    setCurrentPage(1)
  }

  const setFilter = (setter) => (event) => {
    setter(event.target.value)
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / MEDICINES_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * MEDICINES_PER_PAGE
  const displayedMedicines = filteredMedicines.slice(startIndex, startIndex + MEDICINES_PER_PAGE)

  /* ==========================================================
     SAVE HANDLERS
  ========================================================== */

  const handleMedicineSaved = (saved, form) => {
    const isEditing = Boolean(editor?.item)

    if (isEditing) {
      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === editor.item.id
            ? { ...medicine, ...form, ...(saved || {}), id: medicine.id }
            : medicine
        )
      )
      setNotice(`${medicineLabel(form)} was updated.`)
    } else if (saved) {
      setMedicines((current) => [saved, ...current])
      setNotice(`${medicineLabel(form)} was added to the catalog.`)
    } else {
      loadData()
      setNotice(`${medicineLabel(form)} was added to the catalog.`)
    }

    setEditor(null)
  }

  const handleCategorySaved = (saved, form) => {
    const isEditing = Boolean(editor?.item)

    if (isEditing) {
      setCategories((current) =>
        current.map((category) =>
          category.id === editor.item.id
            ? { ...category, ...form, ...(saved || {}), id: category.id }
            : category
        )
      )
      setNotice(`Category "${form.name.trim()}" was updated.`)
    } else if (saved) {
      setCategories((current) => [...current, saved])
      setNotice(`Category "${form.name.trim()}" was added.`)
    } else {
      loadData()
    }

    setEditor(null)
  }

  /* ==========================================================
     CONFIRM ACTIONS
  ========================================================== */

  const confirmAction = async (reason) => {
    const { type, item } = pendingAction

    if (type === 'delete-category') {
      await deleteMedicineCategory(item.id)
      setCategories((current) => current.filter((category) => category.id !== item.id))
      setNotice(`Category "${item.name}" was deleted.`)
    } else {
      const archived = type === 'archive'
      const updated = await setMedicineArchived(item.id, archived, reason)

      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === item.id
            ? { ...medicine, ...(updated || {}), isArchived: archived, id: medicine.id }
            : medicine
        )
      )

      setNotice(`${medicineLabel(item)} was ${archived ? 'archived' : 'restored'}.`)
    }

    setPendingAction(null)
  }

  const dialogConfig = (() => {
    if (!pendingAction) return null

    const { type, item } = pendingAction

    if (type === 'archive') {
      return {
        tone: 'danger',
        title: `Archive ${medicineLabel(item)}?`,
        message:
          'Archived medicines are hidden from customer search and cannot be added to new pharmacy inventories. Existing records are kept, and you can restore it later.',
        confirmLabel: 'Archive Medicine',
        reasonMode: 'optional',
        reasonPlaceholder: 'e.g. Discontinued by manufacturer, FDA recall, duplicate entry...',
        details:
          (item.pharmacyCount || 0) > 0
            ? `${item.pharmacyCount} ${item.pharmacyCount === 1 ? 'pharmacy currently lists' : 'pharmacies currently list'} this medicine.`
            : null,
      }
    }

    if (type === 'restore') {
      return {
        tone: 'success',
        title: `Restore ${medicineLabel(item)}?`,
        message: 'The medicine becomes searchable again and pharmacies can list it.',
        confirmLabel: 'Restore Medicine',
        reasonMode: 'none',
      }
    }

    return {
      tone: 'danger',
      title: `Delete category "${item.name}"?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete Category',
      reasonMode: 'none',
    }
  })()

  /* ==========================================================
     RENDER
  ========================================================== */

  const notOnServer = error?.status === 404

  return (
    <>
      <div className="page-header-sticky">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <h1>Medicine Catalog</h1>
            </div>

            <p>Standardized medicines that partner pharmacies list in their inventory.</p>
          </div>

          <div className="page-header-actions">
            <div className="pharmacy-count">
              {activeCount} {activeCount === 1 ? 'medicine' : 'medicines'}
            </div>

            <button
              type="button"
              className="add-pharmacy-button"
              onClick={() =>
                setEditor({ type: tab === 'categories' ? 'category' : 'medicine', item: null })
              }
              disabled={Boolean(error)}
            >
              <Plus size={18} />
              <span>{tab === 'categories' ? 'Add Category' : 'Add Medicine'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="pharmacies-page">
          {notice && (
            <div className="pharmacy-notice" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {/* TABS */}

          <div className="catalog-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'medicines'}
              className={`catalog-tab ${tab === 'medicines' ? 'is-active' : ''}`}
              onClick={() => setTab('medicines')}
            >
              <Pill size={16} />
              Medicines
              <span className="catalog-tab-count">{loading ? '…' : medicines.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === 'categories'}
              className={`catalog-tab ${tab === 'categories' ? 'is-active' : ''}`}
              onClick={() => setTab('categories')}
            >
              <FolderOpen size={16} />
              Categories
              <span className="catalog-tab-count">{loading ? '…' : categories.length}</span>
            </button>

            {!loading && !error && (
              <span className="catalog-summary">
                {catalogCount} in catalog · {activeCount - catalogCount} pharmacy-added · {rxCount} Rx ·{' '}
                {medicines.length - activeCount} archived
              </span>
            )}
          </div>

          {/* ERROR / LOADING */}

          {loading && medicines.length === 0 && categories.length === 0 ? (
            <div className="pharmacy-table-card">
              <div className="table-state">Loading medicine catalog...</div>
            </div>
          ) : error ? (
            <div className="pharmacy-table-card">
              <div className="table-state">
                {notOnServer ? <FileWarning size={28} /> : null}
                <span className={notOnServer ? '' : 'catalog-error-text'}>
                  {notOnServer
                    ? 'The medicine catalog API has not been added to the server yet.'
                    : error.message || 'Failed to load the medicine catalog.'}
                </span>
                <button type="button" className="secondary-button" onClick={loadData}>
                  Try again
                </button>
              </div>
            </div>
          ) : tab === 'medicines' ? (
            <>
              {/* MEDICINES TOOLBAR */}

              <div className="pharmacy-toolbar">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search generic name, brand, dosage..."
                    value={search}
                    onChange={setFilter(setSearch)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="search-clear-button"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="toolbar-filters">
                  <label className="sort-box">
                    <Tag size={16} />
                    <select value={categoryFilter} onChange={setFilter(setCategoryFilter)} aria-label="Filter by category">
                      <option value="all">All categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={String(category.id)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sort-box">
                    <Store size={16} />
                    <select value={sourceFilter} onChange={setFilter(setSourceFilter)} aria-label="Filter by source">
                      <option value="all">All sources</option>
                      <option value="catalog">Global catalog</option>
                      <option value="pharmacy">Pharmacy-added</option>
                    </select>
                  </label>

                  <label className="sort-box">
                    <Filter size={16} />
                    <select value={typeFilter} onChange={setFilter(setTypeFilter)} aria-label="Filter by type">
                      <option value="all">Rx and OTC</option>
                      <option value="rx">Prescription (Rx)</option>
                      <option value="otc">Over the counter</option>
                    </select>
                  </label>

                  <label className="sort-box">
                    <Archive size={16} />
                    <select value={statusFilter} onChange={setFilter(setStatusFilter)} aria-label="Filter by status">
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                      <option value="all">All</option>
                    </select>
                  </label>

                  <label className="sort-box">
                    <ArrowUpDown size={16} />
                    <select value={sort} onChange={setFilter(setSort)} aria-label="Sort medicines">
                      <option value="az">Name A–Z</option>
                      <option value="category">By category</option>
                      <option value="newest">Newest first</option>
                    </select>
                  </label>

                  {activeFilterCount > 0 && (
                    <button type="button" className="clear-filters-button" onClick={clearFilters}>
                      Clear ({activeFilterCount})
                    </button>
                  )}

                  <button
                    type="button"
                    className="toolbar-icon-button"
                    onClick={loadData}
                    disabled={loading}
                    aria-label="Refresh"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={loading ? 'pharmacy-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* MEDICINES TABLE */}

              <div className="pharmacy-table-card">
                {filteredMedicines.length === 0 ? (
                  <div className="table-state">
                    <span>
                      {medicines.length === 0
                        ? 'The catalog is empty. Add the first medicine to get started.'
                        : 'No medicines match your search or filters.'}
                    </span>

                    {medicines.length === 0 ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setEditor({ type: 'medicine', item: null })}
                      >
                        Add Medicine
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={clearFilters}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="pharmacy-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage &amp; Form</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Listed By</th>
                          <th>Status</th>
                          <th className="actions-heading">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {displayedMedicines.map((medicine) => (
                          <tr key={medicine.id} className={medicine.isArchived ? 'is-archived' : ''}>
                            <td>
                              <div className="pharmacy-name-cell">
                                <div className="pharmacy-icon">
                                  <Pill size={18} />
                                </div>

                                <div className="pharmacy-name-text">
                                  <strong>{medicine.genericName}</strong>
                                  <span className="medicine-brand">
                                    {medicine.brandName || 'Generic'}
                                  </span>
                                  {medicine.isCatalog ? (
                                    <span className="medicine-source is-catalog">Global catalog</span>
                                  ) : (
                                    <span className="medicine-source" title={medicine.pharmacyName}>
                                      <Store size={11} />
                                      {medicine.pharmacyName || 'Pharmacy-added'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="medicine-dosage">{medicine.dosage}</span>
                              <span className="medicine-form">{medicine.form || '—'}</span>
                            </td>

                            <td>
                              <span className="medicine-category">{getCategoryName(medicine)}</span>
                            </td>

                            <td>
                              {medicine.requiresPrescription ? (
                                <span className="rx-badge">Rx</span>
                              ) : (
                                <span className="otc-badge">OTC</span>
                              )}
                            </td>

                            <td>
                              <span className="registered-date">
                                {medicine.pharmacyCount === null
                                  ? '—'
                                  : `${medicine.pharmacyCount} ${medicine.pharmacyCount === 1 ? 'pharmacy' : 'pharmacies'}`}
                              </span>
                            </td>

                            <td>
                              <span className={`status-badge ${medicine.isArchived ? 'inactive' : 'active'}`}>
                                {medicine.isArchived ? 'Archived' : 'Active'}
                              </span>
                            </td>

                            <td className="actions-cell">
                              <div className="row-actions">
                                {medicine.isArchived ? (
                                  <button
                                    type="button"
                                    className="row-action-button action-activate"
                                    onClick={() => setPendingAction({ type: 'restore', item: medicine })}
                                  >
                                    <ArchiveRestore size={14} />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="row-action-button"
                                      onClick={() => setEditor({ type: 'medicine', item: medicine })}
                                    >
                                      <Pencil size={14} />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="row-action-button action-deactivate"
                                      onClick={() => setPendingAction({ type: 'archive', item: medicine })}
                                    >
                                      <Archive size={14} />
                                      <span>Archive</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {filteredMedicines.length > 0 && (
                <div className="table-footer">
                  <span>
                    Showing {startIndex + 1}–
                    {Math.min(startIndex + MEDICINES_PER_PAGE, filteredMedicines.length)} of{' '}
                    {filteredMedicines.length} {filteredMedicines.length === 1 ? 'medicine' : 'medicines'}
                  </span>

                  <div className="pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                      disabled={safePage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                      disabled={safePage >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* CATEGORIES */

            <div className="pharmacy-table-card">
              {categories.length === 0 ? (
                <div className="table-state">
                  <span>No categories yet. Add categories before adding medicines.</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditor({ type: 'category', item: null })}
                  >
                    Add Category
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="pharmacy-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Medicines</th>
                        <th className="actions-heading">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...categories]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((category) => {
                          const count = categoryCounts.get(String(category.id)) ?? category.medicineCount

                          return (
                            <tr key={category.id}>
                              <td>
                                <div className="pharmacy-name-cell">
                                  <div className="pharmacy-icon">
                                    <Tag size={17} />
                                  </div>

                                  <div className="pharmacy-name-text">
                                    <strong>{category.name}</strong>
                                    {category.description && (
                                      <span className="medicine-brand">{category.description}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="category-count-link"
                                  onClick={() => {
                                    setCategoryFilter(String(category.id))
                                    setStatusFilter('all')
                                    setCurrentPage(1)
                                    setTab('medicines')
                                  }}
                                  disabled={count === 0}
                                >
                                  {count} {count === 1 ? 'medicine' : 'medicines'}
                                </button>
                              </td>

                              <td className="actions-cell">
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action-button"
                                    onClick={() => setEditor({ type: 'category', item: category })}
                                  >
                                    <Pencil size={14} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="row-action-button action-deactivate"
                                    onClick={() => setPendingAction({ type: 'delete-category', item: category })}
                                    disabled={count > 0}
                                    title={
                                      count > 0
                                        ? 'Move or archive its medicines before deleting this category.'
                                        : undefined
                                    }
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete</span>
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
          )}

          {/* MODALS */}

          {editor?.type === 'medicine' && (
            <MedicineFormModal
              medicine={editor.item}
              categories={categories}
              existingMedicines={medicines}
              onClose={() => setEditor(null)}
              onSaved={handleMedicineSaved}
            />
          )}

          {editor?.type === 'category' && (
            <CategoryFormModal
              category={editor.item}
              categories={categories}
              onClose={() => setEditor(null)}
              onSaved={handleCategorySaved}
            />
          )}

          <ConfirmActionDialog
            open={Boolean(pendingAction)}
            tone={dialogConfig?.tone}
            title={dialogConfig?.title}
            message={dialogConfig?.message}
            details={dialogConfig?.details}
            confirmLabel={dialogConfig?.confirmLabel}
            reasonMode={dialogConfig?.reasonMode}
            reasonPlaceholder={dialogConfig?.reasonPlaceholder}
            onConfirm={confirmAction}
            onClose={() => setPendingAction(null)}
          />
        </div>
      </div>
    </>
  )
}
