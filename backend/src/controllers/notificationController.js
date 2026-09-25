const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

const getAuthenticatedUserId = (req) => {
  const userId = Number(
    req.pharmaUser?.user_id,
  )

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return null
  }

  return userId
}

/* ============================================================
   GET MY NOTIFICATIONS
   GET /api/notifications
============================================================ */

const getMyNotifications = async (req, res) => {
  try {
    const userId =
      getAuthenticatedUserId(req)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated user not found',
      })
    }

    const { data, error } =
      await supabaseAdmin
        .from('notifications')
        .select(`
          notification_id,
          user_id,
          title,
          message,
          type,
          is_read,
          created_at,
          read_at
        `)
        .eq('user_id', userId)
        .order('created_at', {
          ascending: false,
        })

    if (error) {
      console.error(
        'Get notifications error:',
        error,
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to load notifications',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Notifications loaded successfully',
      data: data || [],
    })
  } catch (error) {
    console.error(
      'Get notifications server error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET UNREAD COUNT
   GET /api/notifications/unread-count
============================================================ */

const getUnreadCount = async (req, res) => {
  try {
    const userId =
      getAuthenticatedUserId(req)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated user not found',
      })
    }

    const { count, error } =
      await supabaseAdmin
        .from('notifications')
        .select('notification_id', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', userId)
        .eq('is_read', false)

    if (error) {
      console.error(
        'Get unread notification count error:',
        error,
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to load unread notification count',
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        unread_count: count || 0,
      },
    })
  } catch (error) {
    console.error(
      'Get unread notification count server error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   MARK ONE NOTIFICATION AS READ
   PATCH /api/notifications/:notificationId/read
============================================================ */

const markNotificationAsRead =
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req)

      const notificationId = Number(
        req.params.notificationId,
      )

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated user not found',
        })
      }

      if (
        !Number.isInteger(
          notificationId,
        ) ||
        notificationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Valid notification ID is required',
        })
      }

      /*
       * First make sure this notification
       * belongs to the authenticated user.
       */
      const {
        data: notification,
        error: lookupError,
      } = await supabaseAdmin
        .from('notifications')
        .select(`
          notification_id,
          user_id,
          is_read,
          read_at
        `)
        .eq(
          'notification_id',
          notificationId,
        )
        .eq('user_id', userId)
        .maybeSingle()

      if (lookupError) {
        console.error(
          'Notification lookup error:',
          lookupError,
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load notification',
        })
      }

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            'Notification not found',
        })
      }

      /*
       * Already read: return it without
       * changing read_at again.
       */
      if (notification.is_read) {
        return res.status(200).json({
          success: true,
          message:
            'Notification is already read',
          data: notification,
        })
      }

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from('notifications')
        .update({
          is_read: true,
          read_at:
            new Date().toISOString(),
        })
        .eq(
          'notification_id',
          notificationId,
        )
        .eq('user_id', userId)
        .select(`
          notification_id,
          user_id,
          title,
          message,
          type,
          is_read,
          created_at,
          read_at
        `)
        .single()

      if (updateError) {
        console.error(
          'Mark notification read error:',
          updateError,
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to mark notification as read',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Notification marked as read',
        data: updated,
      })
    } catch (error) {
      console.error(
        'Mark notification read server error:',
        error,
      )

      return res.status(500).json({
        success: false,
        message: 'Server error',
      })
    }
  }

/* ============================================================
   MARK ALL MY NOTIFICATIONS AS READ
   PATCH /api/notifications/read-all
============================================================ */

const markAllNotificationsAsRead =
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req)

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated user not found',
        })
      }

      const readAt =
        new Date().toISOString()

      /*
       * Only update unread rows.
       *
       * This is important because your DB constraint requires:
       *
       * is_read = false -> read_at IS NULL
       * is_read = true  -> read_at IS NOT NULL
       */
      const { data, error } =
        await supabaseAdmin
          .from('notifications')
          .update({
            is_read: true,
            read_at: readAt,
          })
          .eq('user_id', userId)
          .eq('is_read', false)
          .select('notification_id')

      if (error) {
        console.error(
          'Mark all notifications read error:',
          error,
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to mark notifications as read',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'All notifications marked as read',
        data: {
          updated_count:
            data?.length || 0,
        },
      })
    } catch (error) {
      console.error(
        'Mark all notifications read server error:',
        error,
      )

      return res.status(500).json({
        success: false,
        message: 'Server error',
      })
    }
  }

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
}