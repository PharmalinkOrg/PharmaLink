import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { apiRequest } from '../lib/api'

const emptyForm = {
  category_id: '',
  generic_name: '',
  brand_name: '',
  dosage: '',
  dosage_form: '',
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
      dosage_form: item.dosage_form,
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

      <div className="inventory-grid">
        <form className="inventory-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit medicine' : 'Add medicine'}</h3>
          <label>
            Category
            <select name="category_id" value={form.category_id} onChange={updateForm} required>
              <option value="" disabled>Select a category</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>Generic name<input name="generic_name" value={form.generic_name} onChange={updateForm} required /></label>
          <label>Brand name<input name="brand_name" value={form.brand_name} onChange={updateForm} /></label>
          <div className="form-row">
            <label>Dosage<input name="dosage" value={form.dosage} onChange={updateForm} required /></label>
            <label>Dosage form<input name="dosage_form" value={form.dosage_form} onChange={updateForm} required /></label>
          </div>
          <label>Description<textarea name="description" value={form.description} onChange={updateForm} rows={3} /></label>
          <label className="checkbox-field">
            <input name="requires_prescription" type="checkbox" checked={form.requires_prescription} onChange={updateForm} />
            Requires prescription
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSaving || categories.length === 0}>
              {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add medicine'}
            </button>
            {editingId && <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>}
          </div>
          {categories.length === 0 && (
            <p className="form-notice">No categories available yet — add one before creating medicines.</p>
          )}
        </form>

        <div className="inventory-table-wrap">
          {isLoading ? <p>Loading medicines…</p> : (
            <table className="inventory-table">
              <thead><tr><th>Generic name</th><th>Brand</th><th>Category</th><th>Dosage</th><th>Rx</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {medicines.length === 0 ? <tr><td colSpan="7">No medicines yet.</td></tr> : medicines.map((item) => (
                  <tr key={item.medicine_id}>
                    <td>{item.generic_name}</td>
                    <td>{item.brand_name || '—'}</td>
                    <td>{getCategoryName(item.category_id)}</td>
                    <td>{item.dosage} {item.dosage_form}</td>
                    <td>{item.requires_prescription ? 'Yes' : 'No'}</td>
                    <td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td>
                    <td className="table-actions">
                      <button type="button" onClick={() => startEdit(item)}>Edit</button>
                      {item.status === 'ACTIVE' && <button type="button" onClick={() => deactivateItem(item)}>Deactivate</button>}
                    </td>
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

export default MedicinesPage