import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

const emptyForm = {
  category_id: '',
  generic_name: '',
  brand_name: '',
  dosage: '',
  dosage_unit: 'mg',
  description: '',
  requires_prescription: false,
}

function MedicinesPage() {
  const { accessToken, user } = useAuth()
  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [prescriptionFilter, setPrescriptionFilter] = useState('ALL')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(15)

  const medicinesPath = `/medicines?pharmacy_id=${user.pharmacy_id}`

  useEffect(() => {
    let isCurrent = true

    apiRequest(medicinesPath, { token: accessToken })
      .then((response) => {
        if (isCurrent) {
          setMedicines(response.data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, medicinesPath, refreshKey])

  useEffect(() => {
    let isCurrent = true

    apiRequest('/medicine-categories', { token: accessToken })
      .then((response) => {
        if (isCurrent) setCategories(response.data)
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSaving(true)

    try {
      const response = await apiRequest(
        editingId ? `/medicines/${editingId}` : '/medicines',
        {
          token: accessToken,
          method: editingId ? 'PATCH' : 'POST',
          body: form,
        },
      )
      setNotice(response.message)
      resetForm()
      setIsLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.medicine_id)
    setNotice('')
    setForm({
      category_id: String(item.category_id),
      generic_name: item.generic_name,
      brand_name: item.brand_name || '',
      dosage: item.dosage || '',
      dosage_unit: item.dosage_unit || 'mg',
      description: item.description || '',
      requires_prescription: item.requires_prescription,
    })
  }

  const deactivateItem = async (item) => {
    if (!window.confirm(`Deactivate ${item.generic_name}?`)) return

    setError('')
    setNotice('')
    try {
      const response = await apiRequest(`/medicines/${item.medicine_id}`, {
        token: accessToken,
        method: 'DELETE',
      })
      setNotice(response.message)
      if (editingId === item.medicine_id) resetForm()
      setIsLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const getCategoryName = (categoryId) => {
    return categories.find((c) => c.category_id === categoryId)?.name || `#${categoryId}`
  }

  // --------------------------------------------------
  // Filtering and search
  // --------------------------------------------------

  const filteredMedicines = useMemo(() => {
    let filtered = [...medicines]

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((medicine) => {
        const genericName = medicine.generic_name.toLowerCase()
        const brandName = (medicine.brand_name || '').toLowerCase()
        const category = getCategoryName(medicine.category_id).toLowerCase()
        const dosage = `${medicine.dosage} ${medicine.dosage_unit || 'mg'}`.toLowerCase()

        return (
          genericName.includes(term) ||
          brandName.includes(term) ||
          category.includes(term) ||
          dosage.includes(term)
        )
      })
    }

    // Apply category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(
        (medicine) => String(medicine.category_id) === categoryFilter
      )
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(
        (medicine) => medicine.status === statusFilter
      )
    }

    // Apply prescription filter
    if (prescriptionFilter !== 'ALL') {
      const requiresPrescription = prescriptionFilter === 'YES'
      filtered = filtered.filter(
        (medicine) => medicine.requires_prescription === requiresPrescription
      )
    }

    return filtered
  }, [medicines, searchTerm, categoryFilter, statusFilter, prescriptionFilter])

  // --------------------------------------------------
  // Pagination
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage)
  const paginatedMedicines = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredMedicines.slice(startIndex, endIndex)
  }, [filteredMedicines, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, statusFilter, prescriptionFilter])

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <section className="medicines-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Medicines</h2>
          <p className="page-copy">Manage your pharmacy's medicine catalog.</p>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <div className="medicines-layout">
        {/* Form Panel - Always Visible */}
        <div className="medicine-form-panel">
          <form className="medicine-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Edit medicine' : 'Add medicine'}</h3>
            
            <label>
              Category *
              <select name="category_id" value={form.category_id} onChange={updateForm} required>
                <option value="" disabled>Select a category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            
            <label>
              Generic name *
              <input name="generic_name" value={form.generic_name} onChange={updateForm} required />
            </label>
            
            <label>
              Brand name
              <input name="brand_name" value={form.brand_name} onChange={updateForm} />
            </label>
            
            <div className="dosage-field-group">
              <label>
                Dosage *
                <div className="dosage-input-wrapper">
                  <input 
                    name="dosage" 
                    type="text" 
                    value={form.dosage} 
                    onChange={updateForm} 
                    placeholder="e.g., 500"
                    className="dosage-value-input"
                    required 
                  />
                  <select 
                    name="dosage_unit" 
                    value={form.dosage_unit} 
                    onChange={updateForm}
                    className="dosage-unit-select"
                    required
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="mcg">mcg</option>
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="IU">IU</option>
                    <option value="%">%</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </label>
            </div>

            <label>
              Description
              <textarea name="description" value={form.description} onChange={updateForm} rows={3} />
            </label>
            
            <label className="checkbox-field">
              <input name="requires_prescription" type="checkbox" checked={form.requires_prescription} onChange={updateForm} />
              Requires prescription
            </label>
            
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={isSaving || categories.length === 0}>
                {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add medicine'}
              </button>
              {editingId && (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
            
            {categories.length === 0 && (
              <p className="form-notice">No categories available yet — add one before creating medicines.</p>
            )}
          </form>
        </div>

        {/* Table Panel with Search and Filters */}
        <div className="medicines-table-panel">
          <div className="medicines-table-card">
            {/* Search and Filters */}
            <div className="medicines-search-filters">
              <div className="search-bar">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by medicine name, brand, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="filter-row">
                <label>
                  <span>Category</span>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="ALL">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                <label>
                  <span>Prescription</span>
                  <select value={prescriptionFilter} onChange={(e) => setPrescriptionFilter(e.target.value)}>
                    <option value="ALL">All</option>
                    <option value="YES">Requires Rx</option>
                    <option value="NO">No Rx Required</option>
                  </select>
                </label>

                {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || prescriptionFilter !== 'ALL') && (
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={() => {
                      setSearchTerm('')
                      setCategoryFilter('ALL')
                      setStatusFilter('ALL')
                      setPrescriptionFilter('ALL')
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Info */}
            {!isLoading && (
              <div className="medicines-results-info">
                <span>
                  Showing {paginatedMedicines.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredMedicines.length)} of{' '}
                  {filteredMedicines.length} medicine{filteredMedicines.length !== 1 ? 's' : ''}
                </span>
                {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || prescriptionFilter !== 'ALL') && (
                  <span className="filtered-indicator">
                    (filtered from {medicines.length} total)
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="medicines-state">
                <p>Loading medicines…</p>
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="medicines-state">
                <h3>
                  {searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || prescriptionFilter !== 'ALL'
                    ? 'No matching medicines'
                    : 'No medicines yet'}
                </h3>
                <p>
                  {searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || prescriptionFilter !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first medicine using the form on the left.'}
                </p>
              </div>
            ) : (
              <>
                <div className="medicines-table-scroll">
                  <table className="medicines-table">
                    <thead>
                      <tr>
                        <th>Generic name</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Dosage</th>
                        <th>Rx</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMedicines.map((item) => (
                        <tr key={item.medicine_id}>
                          <td><strong>{item.generic_name}</strong></td>
                          <td>{item.brand_name || '—'}</td>
                          <td>{getCategoryName(item.category_id)}</td>
                          <td>{item.dosage} {item.dosage_unit || 'mg'}</td>
                          <td>{item.requires_prescription ? 'Yes' : 'No'}</td>
                          <td>
                            <span className={`status-pill ${item.status.toLowerCase()}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="table-actions">
                            <button type="button" onClick={() => startEdit(item)}>Edit</button>
                            {item.status === 'ACTIVE' && (
                              <button type="button" onClick={() => deactivateItem(item)}>
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="medicines-pagination">
                    <button
                      type="button"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                      aria-label="Previous page"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      Previous
                    </button>

                    <div className="pagination-pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          )
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1

                          return (
                            <span key={page}>
                              {showEllipsis && <span className="pagination-ellipsis">...</span>}
                              <button
                                type="button"
                                onClick={() => goToPage(page)}
                                className={`pagination-page ${
                                  currentPage === page ? 'active' : ''
                                }`}
                              >
                                {page}
                              </button>
                            </span>
                          )
                        })}
                    </div>

                    <button
                      type="button"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                      aria-label="Next page"
                    >
                      Next
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MedicinesPage