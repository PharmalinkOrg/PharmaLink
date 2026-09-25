const supabaseAdmin = require('../config/supabaseAdmin')

const ALLOWED_NOTIFICATION_TYPES = [
  'PRESCRIPTION',
  'RESERVATION',
  'MEDICINE_REQUEST',
  'SYSTEM',
]

/**
 * Normalize and validate a notification type.
 */
const normalizeType = (type) => {
  const normalized =
    typeof type === 'string'
      ? type.trim().toUpperCase()
      : ''

  return ALLOWED_NOTIFICATION_TYPES.includes(normalized)
    ? normalized
    : 'SYSTEM'
}

/**
 * Create one notification.
 *
 * Notification failures should normally not cause the
 * business operation that triggered them to fail.
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'SYSTEM',
}) => {
  try {
    const parsedUserId = Number(userId)

    if (
      !Number.isInteger(parsedUserId) ||
      parsedUserId <= 0
    ) {
      console.error(
        'Notification creation skipped: invalid user ID',
        userId,
      )

      return null
    }

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      console.error(
        'Notification creation skipped: title is required',
      )

      return null
    }

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      console.error(
        'Notification creation skipped: message is required',
      )

      return null
    }

    const { data, error } =
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: parsedUserId,
          title: title.trim(),
          message: message.trim(),
          type: normalizeType(type),
          is_read: false,
          read_at: null,
        })
        .select('*')
        .single()

    if (error) {
      console.error(
        'Create notification error:',
        error,
      )

      return null
    }

    return data
  } catch (error) {
    console.error(
      'Create notification service error:',
      error,
    )

    return null
  }
}

/**
 * Create notifications for multiple users.
 *
 * Duplicate user IDs are automatically removed.
 */
const createNotifications = async ({
  userIds,
  title,
  message,
  type = 'SYSTEM',
}) => {
  try {
    if (!Array.isArray(userIds)) {
      return []
    }

    const uniqueUserIds = [
      ...new Set(
        userIds
          .map(Number)
          .filter(
            (userId) =>
              Number.isInteger(userId) &&
              userId > 0,
          ),
      ),
    ]

    if (uniqueUserIds.length === 0) {
      return []
    }

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      console.error(
        'Bulk notification creation skipped: title and message are required',
      )

      return []
    }

    const rows = uniqueUserIds.map(
      (userId) => ({
        user_id: userId,
        title: title.trim(),
        message: message.trim(),
        type: normalizeType(type),
        is_read: false,
        read_at: null,
      }),
    )

    const { data, error } =
      await supabaseAdmin
        .from('notifications')
        .insert(rows)
        .select('*')

    if (error) {
      console.error(
        'Create notifications error:',
        error,
      )

      return []
    }

    return data || []
  } catch (error) {
    console.error(
      'Create notifications service error:',
      error,
    )

    return []
  }
}

module.exports = {
  ALLOWED_NOTIFICATION_TYPES,
  createNotification,
  createNotifications,
}