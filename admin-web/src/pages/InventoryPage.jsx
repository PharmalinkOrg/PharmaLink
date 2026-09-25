import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'
import MedicineDropdown from '../components/MedicineDropdown'

const emptyForm = {
  medicine_id: '',
  batch_number: '',
  quantity: '',
  reorder_level: '',
  unit_price: '',
  expiration_date: '',
}

function InventoryPage() {
  const { accessToken, user } = useAuth()

  const [inventory, setInventory] = useState([])
  const [medicines, setMedicines] = useState([])
  const [form, setForm] = useState(emptyForm)

  const [editingId, setEditingId] = useState(null)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [medicineFilter, setMedicineFilter] = useState('ALL')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(15)

  const inventoryPath = `/pharmacies/${user.pharmacy_id}/inventory`
  const medicinesPath = `/medicines?pharmacy_id=${user.pharmacy_id}`

  /* =========================================================
     LOAD INVENTORY
     ========================================================= */

  useEffect(() => {
    let isCurrent = true

    apiRequest(inventoryPath, {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setInventory(response.data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, inventoryPath, refreshKey])

  /* =========================================================
     LOAD MEDICINES
     ========================================================= */

  useEffect(() => {
    let isCurrent = true

    apiRequest(medicinesPath, {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setMedicines(response.data)
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken, medicinesPath])

  /* =========================================================
     FORM UPDATE
     ========================================================= */

  const updateForm = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  /* =========================================================
     MEDICINE DROPDOWN UPDATE
     ========================================================= */

  const updateMedicine = (medicineId) => {
    setForm((current) => ({
      ...current,
      medicine_id: medicineId,
    }))

    // Clear a previous medicine validation error
    setError('')
  }

  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  /* =========================================================
     CREATE / UPDATE INVENTORY
     ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setNotice('')

    /* -------------------------------------------------------
       Medicine validation
       ------------------------------------------------------- */

    if (!form.medicine_id) {
      setError('Please select a medicine.')
      return
    }

    setIsSaving(true)

    try {
      const response = await apiRequest(
        editingId
          ? `${inventoryPath}/${editingId}`
          : inventoryPath,
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

  /* =========================================================
     START EDIT
     ========================================================= */

  const startEdit = (item) => {
    setEditingId(item.inventory_id)

    setNotice('')
    setError('')

    setForm({
      medicine_id: String(item.medicine_id),
      batch_number: item.batch_number,
      quantity: String(item.quantity),
      reorder_level: String(item.reorder_level),
      unit_price: String(item.unit_price),
      expiration_date: item.expiration_date || '',
    })

    // Scroll to the form when editing
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  /* =========================================================
     DELETE INVENTORY
     ========================================================= */

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete batch ${item.batch_number}?`)) {
      return
    }

    setError('')
    setNotice('')

    try {
      const response = await apiRequest(
        `${inventoryPath}/${item.inventory_id}`,
        {
          token: accessToken,
          method: 'DELETE',
        },
      )

      setNotice(response.message)

      if (editingId === item.inventory_id) {
        resetForm()
      }

      setIsLoading(true)

      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  /* =========================================================
     GET MEDICINE NAME
     ========================================================= */

  const getMedicineName = (medicineId) => {
    const medicine = medicines.find(
      (medicine) =>
        String(medicine.medicine_id) === String(medicineId),
    )

    if (!medicine) {
      return `#${medicineId}`
    }

    return (
      medicine.brand_name ||
      medicine.generic_name ||
      `#${medicineId}`
    )
  }

  /* =========================================================
     SEARCH AND FILTER
     ========================================================= */

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const medicineName = getMedicineName(item.medicine_id).toLowerCase()
      const batchNumber = item.batch_number.toLowerCase()
      
      const matchesSearch = 
        medicineName.includes(searchLower) ||
        batchNumber.includes(searchLower)

      // Status filter
      const matchesStatus = 
        statusFilter === 'ALL' || 
        item.status === statusFilter

      // Medicine filter
      const matchesMedicine = 
        medicineFilter === 'ALL' || 
        String(item.medicine_id) === medicineFilter

      return matchesSearch && matchesStatus && matchesMedicine
    })
  }, [inventory, searchTerm, statusFilter, medicineFilter])

  /* =========================================================
     PAGINATION
     ========================================================= */

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredInventory.slice(startIndex, endIndex)
  }, [filteredInventory, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, medicineFilter])

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

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <section className="inventory-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Inventory</h2>
          <p className="page-copy">Manage batches for your assigned pharmacy.</p>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <div className="inventory-layout">
        {/* Form Panel - Always Visible */}
        <div className="inventory-form-panel">
          <form className="inventory-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Edit inventory batch' : 'Add inventory batch'}</h3>

            <label className="medicine-field">
              <span>Medicine</span>
              <MedicineDropdown
                medicines={medicines}
                value={form.medicine_id}
                onChange={updateMedicine}
              />
            </label>

            <label>
              Batch number
              <input
                name="batch_number"
                value={form.batch_number}
                onChange={updateForm}
                required
              />
            </label>

            <div className="form-row">
              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={updateForm}
                  required
                />
              </label>

              <label>
                Reorder level
                <input
                  name="reorder_level"
                  type="number"
                  min="0"
                  value={form.reorder_level}
                  onChange={updateForm}
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Unit price
                <input
                  name="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={updateForm}
                  required
                />
              </label>

              <label>
                Expiry date
                <input
                  name="expiration_date"
                  type="date"
                  value={form.expiration_date}
                  onChange={updateForm}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={isSaving || medicines.length === 0}
              >
                {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add batch'}
              </button>

              {editingId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>

            {medicines.length === 0 && (
              <p className="form-notice">
                No medicines in your catalog yet — add one on the Medicines page first.
              </p>
            )}
          </form>
        </div>

        {/* Table Panel with Search and Filters */}
        <div className="inventory-table-panel">
          <div className="inventory-table-card">
            {/* Search and Filters */}
            <div className="inventory-search-filters">
              <div className="search-bar">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by medicine name, batch number..."
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
                  <span>Medicine</span>
                  <select value={medicineFilter} onChange={(e) => setMedicineFilter(e.target.value)}>
                    <option value="ALL">All Medicines</option>
                    {medicines.map((medicine) => (
                      <option key={medicine.medicine_id} value={medicine.medicine_id}>
                        {medicine.brand_name || medicine.generic_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </label>

                {(searchTerm || statusFilter !== 'ALL' || medicineFilter !== 'ALL') && (
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('ALL')
                      setMedicineFilter('ALL')
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Info */}
            {!isLoading && (
              <div className="inventory-results-info">
                <span>
                  Showing {paginatedInventory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of{' '}
                  {filteredInventory.length} batch{filteredInventory.length !== 1 ? 'es' : ''}
                </span>
                {(searchTerm || statusFilter !== 'ALL' || medicineFilter !== 'ALL') && (
                  <span className="filtered-indicator">
                    (filtered from {inventory.length} total)
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="inventory-state">
                <p>Loading inventory…</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="inventory-state">
                <h3>
                  {searchTerm || statusFilter !== 'ALL' || medicineFilter !== 'ALL'
                    ? 'No matching batches'
                    : 'No inventory batches yet'}
                </h3>
                <p>
                  {searchTerm || statusFilter !== 'ALL' || medicineFilter !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first batch using the form on the left.'}
                </p>
              </div>
            ) : (
              <>
                <div className="inventory-table-scroll">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInventory.map((item) => (
                        <tr key={item.inventory_id}>
                          <td><strong>{getMedicineName(item.medicine_id)}</strong></td>
                          <td>{item.batch_number}</td>
                          <td>{item.quantity}</td>
                          <td>₱{Number(item.unit_price).toFixed(2)}</td>
                          <td>
                            <span className={`status-pill ${String(item.status).toLowerCase()}`}>
                              {String(item.status).replaceAll('_', ' ')}
                            </span>
                          </td>
                          <td className="table-actions">
                            <button type="button" onClick={() => startEdit(item)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteItem(item)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="inventory-pagination">
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

export default InventoryPage