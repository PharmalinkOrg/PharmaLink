// File: backend/utils/fetchAll.js
//
// Supabase returns at most 1000 rows per request. This pages
// through a query until every row is loaded.
//
// Usage:
//   const rows = await fetchAll(() =>
//     supabaseAdmin.from('users').select('user_id, role')
//   )

const PAGE_SIZE = 1000
const MAX_ROWS = 100000

async function fetchAll(buildQuery) {
  const rows = []

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const page = data || []
    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }
  }

  return rows
}

module.exports = fetchAll
