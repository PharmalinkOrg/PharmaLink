import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Search,
  ArrowUpDown,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'
import { getPharmacies } from '../services/superadminDashboardServices'
import './Pharmaciespage.css'

export function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const pharmaciesPerPage = 5

  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await getPharmacies()
        setPharmacies(data)
      } catch (error) {
        console.error('Failed to load pharmacies:', error)
        setError(error.message || 'Failed to load pharmacies')
      } finally {
        setLoading(false)
      }
    }

    loadPharmacies()
  }, [])

  const filteredPharmacies = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = pharmacies.filter((pharmacy) => {
      if (!query) return true

      return [
        pharmacy.name,
        pharmacy.address,
        pharmacy.email,
        pharmacy.contact_number,
        pharmacy.status,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'az') {
        return (a.name || '').localeCompare(b.name || '')
      }

      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [pharmacies, search, sort])

  const totalPages = Math.ceil(
    filteredPharmacies.length / pharmaciesPerPage
  )

  const startIndex = (currentPage - 1) * pharmaciesPerPage

  const displayedPharmacies = filteredPharmacies.slice(
    startIndex,
    startIndex + pharmaciesPerPage
  )

  const formatDate = (date) => {
    if (!date) return '—'

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const handleSort = (event) => {
    setSort(event.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="pharmacies-page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <Building2 size={24} />
            <h1>Pharmacies</h1>
          </div>

          <p>
            View and manage all pharmacies registered in PharmaLink.
          </p>
        </div>

        <div className="pharmacy-count">
          {pharmacies.length} pharmacies
        </div>
      </div>

      <div className="pharmacy-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search pharmacies..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <div className="sort-box">
          <ArrowUpDown size={17} />

          <select
            value={sort}
            onChange={handleSort}
          >
            <option value="newest">Newest to Oldest</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      <div className="pharmacy-table-card">
        {loading ? (
          <div className="table-state">
            Loading pharmacies...
          </div>
        ) : error ? (
          <div className="table-state error">
            {error}
          </div>
        ) : filteredPharmacies.length === 0 ? (
          <div className="table-state">
            {search
              ? 'No pharmacies match your search.'
              : 'No pharmacies found.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Pharmacy</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>

              <tbody>
                {displayedPharmacies.map((pharmacy) => (
                  <tr key={pharmacy.pharmacy_id}>
                    <td>
                      <div className="pharmacy-name-cell">
                        <div className="pharmacy-icon">
                          <Building2 size={18} />
                        </div>

                        <div>
                          <strong>{pharmacy.name}</strong>

                          {pharmacy.address && (
                            <div className="pharmacy-address">
                              <MapPin size={13} />
                              <span>{pharmacy.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="contact-cell">
                        {pharmacy.email && (
                          <div>
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
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${String(
                          pharmacy.status || ''
                        ).toLowerCase()}`}
                      >
                        {pharmacy.status || 'Unknown'}
                      </span>
                    </td>

                    <td>
                      <span className="registered-date">
                        {formatDate(pharmacy.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && filteredPharmacies.length > 0 && (
        <div className="table-footer">
          <span>
            Showing {startIndex + 1}–
            {Math.min(
              startIndex + pharmaciesPerPage,
              filteredPharmacies.length
            )}{' '}
            of {filteredPharmacies.length} pharmacies
          </span>

          <div className="pagination">
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.max(page - 1, 1))
              }
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(page + 1, totalPages)
                )
              }
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}