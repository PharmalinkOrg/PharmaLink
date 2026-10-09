// File: superadmin-web/src/pages/AuditLogsPage.jsx
//
// Real audit log data from GET /superadmin/activity-logs,
// the same source as the dashboard "Recent activity" tile.
// Loads the newest 100 entries; "Load older logs" fetches more.
// Search, filters, paging and export work on the entries
// already loaded.

import { useMemo, useState } from 'react'
import { CalendarRange, Download, Filter, Search, X } from 'lucide-react'

import { useActivityLogs } from '../hooks/useActivityLogs'
import {
  formatActionName,
  formatDateTime,
  formatEntity,
  getActorName,
} from '../utils/activityFormat'
import { downloadCsv } from '../services/settingsService'
import './AuditLogsPage.css'
import './AuditLogsFilters.css'

const FETCH_SIZE = 100
const LOGS_PER_PAGE = 15

const DATE_FILTERS = [
  { value: 'all', label: 'All time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

export function AuditLogsPage() {
  const {
    activities,
    pagination,
    loading,
    error,
    loadMore,
  } = useActivityLogs(FETCH_SIZE)

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
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
          time: new Date(activity.timestamp).getTime() || 0,
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

  const actionOptions = useMemo(
    () => [...new Set(rows.map((row) => row.action).filter(Boolean))].sort(),
    [rows]
  )

  const filteredLogs = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const since =
      dateFilter === 'all' ? 0 : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000

    return rows.filter((row) => {
      if (actionFilter !== 'all' && row.action !== actionFilter) return false
      if (since && row.time < since) return false

      return tokens.every((token) => row.searchText.includes(token))
    })
  }, [rows, search, actionFilter, dateFilter])

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (actionFilter !== 'all' ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setSearch('')
    setActionFilter('all')
    setDateFilter('all')
    setCurrentPage(1)
  }

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10)

    downloadCsv(`pharmalink-audit-logs-${stamp}.csv`, [
      ['Date', 'User', 'Action', 'Details'],
      ...filteredLogs.map((row) => [row.date, row.user, row.action, row.details]),
    ])
  }

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

          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-export-button"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              title="Export the logs currently shown (after filters)"
            >
              <Download size={16} />
              Export CSV
            </button>

          <div className="audit-log-count">
            {initialLoading
              ? 'Loading…'
              : `${totalCount.toLocaleString('en-US')} logs`}
          </div>
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

              {search && (
                <button
                  type="button"
                  className="audit-search-clear"
                  onClick={() => {
                    setSearch('')
                    setCurrentPage(1)
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <label className="audit-filter">
              <Filter size={16} />
              <select
                value={actionFilter}
                onChange={(event) => {
                  setActionFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter by action"
              >
                <option value="all">All actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>

            <label className="audit-filter">
              <CalendarRange size={16} />
              <select
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter by date"
              >
                {DATE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {activeFilterCount > 0 && (
              <button type="button" className="audit-clear-button" onClick={clearFilters}>
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {dateFilter !== 'all' && pagination?.hasMore && (
            <p className="audit-filter-note">
              Filters apply to the {rows.length.toLocaleString('en-US')} logs loaded so far. Use
              “Load older logs” below to include older entries.
            </p>
          )}

          <div className="audit-table-card">
            {initialLoading ? (
              <div className="table-state">Loading audit logs…</div>
            ) : error && rows.length === 0 ? (
              <div className="table-state" role="alert">
                Couldn't load audit logs: {error}
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="table-state">
                {activeFilterCount > 0
                  ? 'No audit logs match your search or filters.'
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
                {activeFilterCount > 0 ? ' matching' : ''} logs
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