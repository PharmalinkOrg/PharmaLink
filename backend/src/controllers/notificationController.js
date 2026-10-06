const supabaseAdmin = require('../config/supabaseAdmin')

// ASSUMPTION: the primary key of your notifications table.
// Your other tables use reservation_id / medicine_request_id,
// so this is probably notification_id. Change to 'id' if not.
const ID_COLUMN = 'notification_id'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

/**
 * loadPharmaUser (userMiddleware) puts the PharmaLink user
 * row on req.pharmaUser, same as your other controllers use.
 */
const getUserId = (req) => {
  const id = Number(
    req.pharmaUser?.user_id ?? req.user?.user_id,
  )

  return Number.isInteger(id) && id > 0
    ? id
    : null
}

const parseId = (value) => {
  const id = Number(value)

  return Number.isInteger(id) && id > 0
    ? id
    : null
}

const unauthorized = (res) =>
  res.status(401).json({
    success: false,
    message: 'Unauthorized',
  })

// =========================================================
// GET /notifications?limit=20&offset=0&unread=true
// =========================================================

const getMyNotifications = async (req, res) => {
  const userId = getUserId(req)

  if (!userId) return unauthorized(res)

  const limit = Math.min(
    Math.max(
      Number(req.query.limit) || DEFAULT_LIMIT,
      1,
    ),
    MAX_LIMIT,
  )

  const offset = Math.max(
    Number(req.query.offset) || 0,
    0,
  )

  const unreadOnly = req.query.unread === 'true'

  try {
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error, count } = await query

    if (error) throw error

    const total = count ?? 0

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    })
  } catch (error) {
    console.error(
      'Get notifications error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Unable to load notifications.',
    })
  }
}

// =========================================================
// GET /notifications/unread-count
// =========================================================

const getUnreadCount = async (req, res) => {
  const userId = getUserId(req)

  if (!userId) return unauthorized(res)

  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select(ID_COLUMN, {
        count: 'exact',
        head: true,
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error

    return res.json({
      success: true,
      data: {
        unread_count: count ?? 0,
      },
    })
  } catch (error) {
    console.error(
      'Get unread notification count error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Unable to load unread count.',
    })
  }
}

// =========================================================
// PATCH /notifications/:id/read
// =========================================================

const markAsRead = async (req, res) => {
  const userId = getUserId(req)
  const notificationId = parseId(req.params.id)

  if (!userId) return unauthorized(res)

  if (!notificationId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid notification ID.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq(ID_COLUMN, notificationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      })
    }

    return res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(
      'Mark notification as read error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Unable to update notification.',
    })
  }
}

// =========================================================
// PATCH /notifications/read-all
// =========================================================

const markAllAsRead = async (req, res) => {
  const userId = getUserId(req)

  if (!userId) return unauthorized(res)

  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select(ID_COLUMN)

    if (error) throw error

    return res.json({
      success: true,
      message: 'All notifications marked as read.',
      data: {
        updated: data?.length ?? 0,
      },
    })
  } catch (error) {
    console.error(
      'Mark all notifications as read error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Unable to update notifications.',
    })
  }
}

// =========================================================
// DELETE /notifications/:id
// =========================================================

const deleteNotification = async (req, res) => {
  const userId = getUserId(req)
  const notificationId = parseId(req.params.id)

  if (!userId) return unauthorized(res)

  if (!notificationId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid notification ID.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq(ID_COLUMN, notificationId)
      .eq('user_id', userId)
      .select(ID_COLUMN)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      })
    }

    return res.json({
      success: true,
      message: 'Notification deleted.',
    })
  } catch (error) {
    console.error(
      'Delete notification error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Unable to delete notification.',
    })
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}