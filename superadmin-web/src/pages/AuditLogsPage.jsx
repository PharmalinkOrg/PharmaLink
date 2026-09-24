// File: superadmin-web/src/pages/AuditLogsPage.jsx

import { useMemo, useState } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import './AuditLogsPage.css'

const auditLogs = [
  {
    id: 1,
    date: '2026-09-24 09:15',
    user: 'Super Admin',
    action: 'Login',
    details: 'User logged into the system',
  },
  {
    id: 2,
    date: '2026-09-24 10:30',
    user: 'Super Admin',
    action: 'Updated Pharmacy',
    details: 'Pharmacy information was updated',
  },
  {
    id: 3,
    date: '2026-09-24 11:45',
    user: 'Super Admin',
    action: 'Created User',
    details: 'A new system user was created',
  },
  {
    id: 4,
    date: '2026-09-24 13:20',
    user: 'Super Admin',
    action: 'Viewed Report',
    details: 'System report was viewed',
  },
]

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const logsPerPage = 3

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return auditLogs

    return auditLogs.filter((log) =>
      `${log.user} ${log.action} ${log.details} ${log.date}`
        .toLowerCase()
        .includes(query),
    )
  }, [search])

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  const startIndex = (currentPage - 1) * logsPerPage

  const displayedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage,
  )

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="audit-logs-page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <ClipboardList size={24} />
            <h1>Audit Logs</h1>
          </div>

          <p>
            View system activities and administrative actions.
          </p>
        </div>

        <div className="audit-log-count">
          {filteredLogs.length} logs
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search audit logs..."
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="audit-table-card">
        {displayedLogs.length === 0 ? (
          <div className="table-state">
            {search
              ? 'No audit logs match your search.'
              : 'No audit logs found.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>{log.user}</td>
                    <td>
                      <span className="audit-action">
                        {log.action}
                      </span>
                    </td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!search && filteredLogs.length > 0 && (
        <div className="audit-footer">
          <span>
            Showing {startIndex + 1}–{Math.min(
              startIndex + logsPerPage,
              filteredLogs.length,
            )}{' '}
            of {filteredLogs.length} logs
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
                  Math.min(page + 1, totalPages),
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