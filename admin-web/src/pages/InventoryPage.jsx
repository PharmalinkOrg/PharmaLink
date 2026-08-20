import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

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
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const inventoryPath = `/pharmacies/${user.pharmacy_id}/inventory`

  useEffect(() => {
    let isCurrent = true

    apiRequest(inventoryPath, { token: accessToken })
      .then((response) => {
        if (isCurrent) {
          setInventory(response.data)
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
  }, [accessToken, inventoryPath, refreshKey])

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
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
        editingId ? `${inventoryPath}/${editingId}` : inventoryPath,
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
    setEditingId(item.inventory_id)
    setNotice('')
    setForm({
      medicine_id: String(item.medicine_id),
      batch_number: item.batch_number,
      quantity: String(item.quantity),
      reorder_level: String(item.reorder_level),
      unit_price: String(item.unit_price),
      expiration_date: item.expiration_date || '',
    })
  }

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete batch ${item.batch_number}?`)) return

    setError('')
    setNotice('')
    try {
      const response = await apiRequest(`${inventoryPath}/${item.inventory_id}`, {
        token: accessToken,
        method: 'DELETE',
      })
      setNotice(response.message)
      if (editingId === item.inventory_id) resetForm()
      setIsLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

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

      <div className="inventory-grid">
        <form className="inventory-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit inventory batch' : 'Add inventory batch'}</h3>
          <label>Medicine ID<input name="medicine_id" type="number" min="1" value={form.medicine_id} onChange={updateForm} required /></label>
          <label>Batch number<input name="batch_number" value={form.batch_number} onChange={updateForm} required /></label>
          <div className="form-row">
            <label>Quantity<input name="quantity" type="number" min="0" value={form.quantity} onChange={updateForm} required /></label>
            <label>Reorder level<input name="reorder_level" type="number" min="0" value={form.reorder_level} onChange={updateForm} required /></label>
          </div>
          <div className="form-row">
            <label>Unit price<input name="unit_price" type="number" min="0" step="0.01" value={form.unit_price} onChange={updateForm} required /></label>
            <label>Expiry date<input name="expiration_date" type="date" value={form.expiration_date} onChange={updateForm} /></label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add batch'}</button>
            {editingId && <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>

        <div className="inventory-table-wrap">
          {isLoading ? <p>Loading inventory…</p> : (
            <table className="inventory-table">
              <thead><tr><th>Medicine</th><th>Batch</th><th>Stock</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {inventory.length === 0 ? <tr><td colSpan="6">No inventory batches yet.</td></tr> : inventory.map((item) => (
                  <tr key={item.inventory_id}>
                    <td>#{item.medicine_id}</td><td>{item.batch_number}</td><td>{item.quantity}</td><td>₱{Number(item.unit_price).toFixed(2)}</td>
                    <td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status.replaceAll('_', ' ')}</span></td>
                    <td className="table-actions"><button type="button" onClick={() => startEdit(item)}>Edit</button><button type="button" onClick={() => deleteItem(item)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

export default InventoryPage
