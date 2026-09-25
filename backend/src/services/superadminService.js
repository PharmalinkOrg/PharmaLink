// File: backend/src/services/superadminService.js
// Description: Reusable query helpers for Super Admin dashboard metrics and activity logs

const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// ============ METRICS QUERIES ============

/**
 * Get Total Pharmacies
 * Current month vs previous month
 *
 * Returns:
 * {
 *   current,
 *   previous,
 *   changePercent,
 *   trend
 * }
 */
async function getTotalPharmacies() {
  const now = new Date()

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  )

  try {
    // Current month
    const { data: currentData, error: currentError } =
      await supabaseAdmin
        .from('pharmacies')
        .select('pharmacy_id', { count: 'exact' })
        .gte('created_at', currentMonthStart.toISOString())

    if (currentError) {
      throw new Error(
        `Current month query failed: ${currentError.message}`
      )
    }

    // Previous month
    const { data: previousData, error: previousError } =
      await supabaseAdmin
        .from('pharmacies')
        .select('pharmacy_id', { count: 'exact' })
        .gte('created_at', previousMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString())

    if (previousError) {
      throw new Error(
        `Previous month query failed: ${previousError.message}`
      )
    }

    const current = currentData?.length || 0
    const previous = previousData?.length || 0

    const changePercent =
      previous === 0
        ? 0
        : Math.round(((current - previous) / previous) * 100)

    return {
      current,
      previous,
      changePercent,
      trend:
        current > previous
          ? 'up'
          : current < previous
            ? 'down'
            : 'flat',
    }
  } catch (error) {
    console.error('getTotalPharmacies error:', error)
    throw error
  }
}

/**
 * Get Active Users
 *
 * Active users are distinct customers who made confirmed
 * reservations during the selected month.
 */
async function getActiveUsers() {
  const now = new Date()

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  )

  try {
    // Current month
    const { data: currentData, error: currentError } =
      await supabaseAdmin
        .from('reservations')
        .select('customer_id')
        .gte('created_at', currentMonthStart.toISOString())
        .eq('status', 'CONFIRMED')

    if (currentError) {
      throw new Error(
        `Current month reservations query failed: ${currentError.message}`
      )
    }

    // Previous month
    const { data: previousData, error: previousError } =
      await supabaseAdmin
        .from('reservations')
        .select('customer_id')
        .gte('created_at', previousMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString())
        .eq('status', 'CONFIRMED')

    if (previousError) {
      throw new Error(
        `Previous month reservations query failed: ${previousError.message}`
      )
    }

    const currentDistinct = new Set(
      (currentData || [])
        .map((row) => row.customer_id)
        .filter(Boolean)
    ).size

    const previousDistinct = new Set(
      (previousData || [])
        .map((row) => row.customer_id)
        .filter(Boolean)
    ).size

    const changePercent =
      previousDistinct === 0
        ? 0
        : Math.round(
            ((currentDistinct - previousDistinct) /
              previousDistinct) *
              100
          )

    return {
      current: currentDistinct,
      previous: previousDistinct,
      changePercent,
      trend:
        currentDistinct > previousDistinct
          ? 'up'
          : currentDistinct < previousDistinct
            ? 'down'
            : 'flat',
    }
  } catch (error) {
    console.error('getActiveUsers error:', error)
    throw error
  }
}

/**
 * Get Pending Pharmacy Verification count
 */
async function getPendingVerification() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pharmacy_verifications')
      .select('id')
      .eq('status', 'pending')

    if (error) {
      throw new Error(
        `Pending verification query failed: ${error.message}`
      )
    }

    return {
      count: data?.length || 0,
    }
  } catch (error) {
    console.error('getPendingVerification error:', error)
    throw error
  }
}

/**
 * Get Complaints
 *
 * Current month vs previous month.
 */
async function getComplaints() {
  const now = new Date()

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  )

  try {
    // Current month
    const { data: currentData, error: currentError } =
      await supabaseAdmin
        .from('complaints')
        .select('id')
        .gte('created_at', currentMonthStart.toISOString())

    if (currentError) {
      throw new Error(
        `Current month complaints query failed: ${currentError.message}`
      )
    }

    // Previous month
    const { data: previousData, error: previousError } =
      await supabaseAdmin
        .from('complaints')
        .select('id')
        .gte('created_at', previousMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString())

    if (previousError) {
      throw new Error(
        `Previous month complaints query failed: ${previousError.message}`
      )
    }

    const current = currentData?.length || 0
    const previous = previousData?.length || 0

    const changePercent =
      previous === 0
        ? 0
        : Math.round(((current - previous) / previous) * 100)

    return {
      current,
      previous,
      changePercent,
      trend:
        current > previous
          ? 'up'
          : current < previous
            ? 'down'
            : 'flat',
    }
  } catch (error) {
    console.error('getComplaints error:', error)
    throw error
  }
}

/**
 * Get All Metrics
 */
async function getMetrics() {
  try {
    const [
      totalPharmacies,
      activeUsers,
      pendingVerification,
      complaints,
    ] = await Promise.all([
      getTotalPharmacies(),
      getActiveUsers(),
      getPendingVerification(),
      getComplaints(),
    ])

    return {
      totalPharmacies,
      activeUsers,
      pendingVerification: pendingVerification.count,
      complaints,
    }
  } catch (error) {
    console.error('getMetrics error:', error)
    throw error
  }
}

// ============ ACTIVITY LOGS QUERIES ============

/**
 * Get Activity Logs
 *
 * Pharmacy verification events from the last 48 hours.
 *
 * Actual activity_logs schema:
 * - id
 * - superadmin_id
 * - action
 * - details
 * - created_at
 */
async function getActivityLogs(limit = 10, offset = 0) {
  const now = new Date()

  const fortyEightHoursAgo = new Date(
    now.getTime() - 48 * 60 * 60 * 1000
  )

  try {
    // Get total count
    const { count: total, error: countError } =
      await supabaseAdmin
        .from('activity_logs')
        .select('id', { count: 'exact' })
        .eq('action', 'pharmacy_verification_changed')
        .gte('created_at', fortyEightHoursAgo.toISOString())

    if (countError) {
      throw new Error(
        `Count query failed: ${countError.message}`
      )
    }

    // Get paginated activity data
    const { data: activities, error: dataError } =
      await supabaseAdmin
        .from('activity_logs')
        .select(`
          id,
          superadmin_id,
          action,
          details,
          created_at
        `)
        .eq('action', 'pharmacy_verification_changed')
        .gte('created_at', fortyEightHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (dataError) {
      throw new Error(
        `Data query failed: ${dataError.message}`
      )
    }

    // Enrich activity logs with pharmacy information
    const enrichedActivities = await Promise.all(
      (activities || []).map(async (activity) => {
        const pharmacyId =
          activity.details?.pharmacy_id ||
          activity.details?.entity_id ||
          activity.details?.pharmacyId

        let pharmacy = null

        if (pharmacyId) {
          const { data } = await supabaseAdmin
            .from('pharmacies')
            .select('pharmacy_id, name')
            .eq('pharmacy_id', pharmacyId)
            .maybeSingle()

          pharmacy = data
        }

        return {
          id: activity.id,
          timestamp: activity.created_at,
          type:
            activity.details?.event_type ||
            activity.action,
          pharmacy: pharmacy
            ? {
                id: pharmacy.pharmacy_id,
                name: pharmacy.name,
              }
            : {
                id: pharmacyId || null,
                name: 'Unknown Pharmacy',
              },
          actor: activity.superadmin_id,
          details: activity.details,
        }
      })
    )

    return {
      activities: enrichedActivities,
      pagination: {
        limit,
        offset,
        total: total || 0,
        hasMore: offset + limit < (total || 0),
      },
    }
  } catch (error) {
    console.error('getActivityLogs error:', error)
    throw error
  }
}

// ============ LOG ACTIVITY HELPER ============

/**
 * Log a Super Admin action.
 *
 * Actual activity_logs schema only supports:
 * - superadmin_id
 * - action
 * - details
 */
async function logActivity(
  superadminId,
  action,
  details = {}
) {
  try {
    const { error } = await supabaseAdmin
      .from('activity_logs')
      .insert([
        {
          superadmin_id: superadminId,
          action,
          details,
        },
      ])

    if (error) {
      console.error('logActivity error:', error)
      throw error
    }
  } catch (error) {
    console.error('logActivity failed:', error)

    // Activity logging should never break the main operation.
  }
}

async function getAllPharmacies() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        pharmacy_id,
        name,
        address,
        contact_number,
        email,
        status,
        latitude,
        longitude,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(
        `Pharmacies query failed: ${error.message}`
      )
    }

    return data || []
  } catch (error) {
    console.error(
      'getAllPharmacies error:',
      error
    )

    throw error
  }
}

module.exports = {
  getMetrics,
  getTotalPharmacies,
  getActiveUsers,
  getPendingVerification,
  getComplaints,
  getActivityLogs,
  getAllPharmacies,
  logActivity,
}