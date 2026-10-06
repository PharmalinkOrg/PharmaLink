// File: superadmin-web/src/pages/AuditLogsPage.jsx
//
// Real audit log data from GET /superadmin/activity-logs,
// the same source as the dashboard "Recent activity" tile.
// Loads the newest 100 entries; "Load older logs" fetches more.
// Search and paging work on the entries already loaded.

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { useActivityLogs } from '../hooks/useActivityLogs'
import {
  formatActionName,
  formatDateTime,
  formatEntity,
  getActorName,
} from '../utils/activityFormat'
import './AuditLogsPage.css'

const FETCH_SIZE = 100
const LOGS_PER_PAGE = 15

export function AuditLogsPage() {
  const {
    activities,
    pagination,
    loading,
    error,
    loadMore,
  } = useActivityLogs(FETCH_SIZE)

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // ---------------------------------------------------------
  // Rows shaped for the table + search
  // ---------------------------------------------------------

  const rows = useMemo(
    () =>
      activities.map((activity, index) => {
        const entity = formatEntity(activity)
        const date = formatDateTime(activity.timestamp)
        const user = getActorName(activity)
        const action = formatActionName(activity.action)

        const details =
          [activity.description, entity]
            .filter(Boolean)
            .join(' · ') || '—'

        return {
          id: activity.id ?? `${activity.timestamp}-${index}`,
          date,
          user,
          action,
          details,
          searchText: `${date} ${user} ${action} ${details} ${
            activity.pharmacy?.name || ''
          }`.toLowerCase(),
        }
      }),
    [activities]
  )

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return rows

    return rows.filter((row) => row.searchText.includes(query))
  }, [rows, search])

  // ---------------------------------------------------------
  // Paging (client side, over loaded rows)
  // ---------------------------------------------------------

  const totalPages = Math.max(
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
    1
  )

  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * LOGS_PER_PAGE

  const displayedLogs = filteredLogs.slice(
    startIndex,
    startIndex + LOGS_PER_PAGE
  )

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const totalCount =
    Number(pagination?.total) > 0
      ? Number(pagination.total)
      : rows.length

  const initialLoading = loading && rows.length === 0

  return (
    <>
      <div className="page-header-sticky">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <h1>Audit Logs</h1>
            </div>

            <p>
              View system activities and administrative actions.
            </p>
          </div>

          <div className="audit-log-count">
            {initialLoading
              ? 'Loading…'
              : `${totalCount.toLocaleString('en-US')} logs`}
          </div>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="audit-logs-page">
          <div className="audit-toolbar">
            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search audit logs..."
                value={search}
                onChange={handleSearch}
                aria-label="Search audit logs"
              />
            </div>
          </div>

          <div className="audit-table-card">
            {initialLoading ? (
              <div className="table-state">Loading audit logs…</div>
            ) : error && rows.length === 0 ? (
              <div className="table-state" role="alert">
                Couldn't load audit logs: {error}
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="table-state">
                {search
                  ? 'No audit logs match your search.'
                  : 'No audit logs recorded yet.'}
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

          {filteredLogs.length > 0 && (
            <div className="audit-footer">
              <span>
                Showing {startIndex + 1}–
                {Math.min(
                  startIndex + LOGS_PER_PAGE,
                  filteredLogs.length
                )}{' '}
                of {filteredLogs.length}
                {search ? ' matching' : ''} logs
                {pagination?.hasMore ? ' loaded' : ''}
              </span>

              <div className="pagination">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(Math.max(page - 1, 1))
                  }
                  disabled={page === 1}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(Math.min(page + 1, totalPages))
                  }
                  disabled={page >= totalPages}
                >
                  Next
                </button>

                {pagination?.hasMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Load older logs'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}