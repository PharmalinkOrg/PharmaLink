import { useEffect, useState } from 'react'
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
     RENDER
     ========================================================= */

  return (
    <section className="inventory-page">

      {/* -----------------------------------------------------
          PAGE HEADER
          ----------------------------------------------------- */}

      <div className="page-heading">
        <div>
          <h2 className="page-title">
            Inventory
          </h2>

          <p className="page-copy">
            Manage batches for your assigned pharmacy.
          </p>
        </div>
      </div>

      {/* -----------------------------------------------------
          ALERTS
          ----------------------------------------------------- */}

      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p className="form-notice">
          {notice}
        </p>
      )}

      {/* -----------------------------------------------------
          INVENTORY GRID
          ----------------------------------------------------- */}

      <div className="inventory-grid">

        {/* ===================================================
            INVENTORY FORM
            =================================================== */}

        <form
          className="inventory-form"
          onSubmit={handleSubmit}
        >

          <h3>
            {editingId
              ? 'Edit inventory batch'
              : 'Add inventory batch'}
          </h3>

          {/* -------------------------------------------------
              MEDICINE DROPDOWN
              ------------------------------------------------- */}

          <label className="medicine-field">
            <span>Medicine</span>

            <MedicineDropdown
              medicines={medicines}
              value={form.medicine_id}
              onChange={updateMedicine}
            />
          </label>

          {/* -------------------------------------------------
              BATCH NUMBER
              ------------------------------------------------- */}

          <label>
            Batch number

            <input
              name="batch_number"
              value={form.batch_number}
              onChange={updateForm}
              required
            />
          </label>

          {/* -------------------------------------------------
              QUANTITY / REORDER LEVEL
              ------------------------------------------------- */}

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

          {/* -------------------------------------------------
              PRICE / EXPIRY
              ------------------------------------------------- */}

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

          {/* -------------------------------------------------
              ACTIONS
              ------------------------------------------------- */}

          <div className="form-actions">

            <button
              className="primary-button"
              type="submit"
              disabled={
                isSaving ||
                medicines.length === 0
              }
            >
              {isSaving
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : 'Add batch'}
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

          {/* -------------------------------------------------
              NO MEDICINES MESSAGE
              ------------------------------------------------- */}

          {medicines.length === 0 && (
            <p className="form-notice">
              No medicines in your catalog yet —
              add one on the Medicines page first.
            </p>
          )}

        </form>

        {/* ===================================================
            INVENTORY TABLE
            =================================================== */}

        <div className="inventory-table-wrap">

          {isLoading ? (
            <p>Loading inventory…</p>
          ) : (
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

                {inventory.length === 0 ? (

                  <tr>
                    <td colSpan="6">
                      No inventory batches yet.
                    </td>
                  </tr>

                ) : (

                  inventory.map((item) => (

                    <tr key={item.inventory_id}>

                      <td>
                        {getMedicineName(
                          item.medicine_id,
                        )}
                      </td>

                      <td>
                        {item.batch_number}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        ₱
                        {Number(
                          item.unit_price,
                        ).toFixed(2)}
                      </td>

                      <td>
                        <span
                          className={`status-pill ${String(
                            item.status,
                          ).toLowerCase()}`}
                        >
                          {String(item.status).replaceAll(
                            '_',
                            ' ',
                          )}
                        </span>
                      </td>

                      <td className="table-actions">

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(item)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteItem(item)
                          }
                        >
                          Delete
                        </button>

                      </td>

                    </tr>

                  ))
                )}

              </tbody>

            </table>
          )}

        </div>

      </div>
    </section>
  )
}

export default InventoryPage