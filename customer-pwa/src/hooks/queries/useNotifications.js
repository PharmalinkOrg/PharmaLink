// File: customer-pwa/src/hooks/queries/useNotifications.js
//
// ASSUMPTION: the customer app has the same apiRequest + useAuth
// helpers as admin-web. If your usePharmacies hook uses a different
// fetch helper, swap these two imports to match it.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { useAuth } from '../../components/auth/useAuth'
import { apiRequest } from '../../lib/api'

export const notificationKeys = {
  all: ['notifications'],
  list: (filter) => ['notifications', 'list', filter],
  unreadCount: ['notifications', 'unread-count'],
}

// Customer-side queries that should refresh when a new notification
// arrives, so the status on "My Requests" etc. matches the bell.
// Rename these to the query keys your app actually uses.
const RELATED_QUERY_KEYS = [
  ['reservations'],
  ['medicine-requests'],
  ['prescriptions'],
]

// Works whether the table's key is notification_id or id.
function getNotificationId(notification) {
  return notification.notification_id ?? notification.id
}

// =========================================================
// LIST
// =========================================================

export function useNotifications({ unreadOnly = false } = {}) {
  const { accessToken } = useAuth()
  const filter = unreadOnly ? 'unread' : 'all'

  return useQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })

      if (unreadOnly) params.set('unread', 'true')

      const response = await apiRequest(
        `/notifications?${params.toString()}`,
        { token: accessToken },
      )

      return Array.isArray(response?.data) ? response.data : []
    },
    enabled: Boolean(accessToken),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

// =========================================================
// UNREAD BADGE COUNT  (polls every 30s while the app is open)
// =========================================================

export function useUnreadNotificationCount() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const previous =
        queryClient.getQueryData(notificationKeys.unreadCount) ?? 0

      const response = await apiRequest(
        '/notifications/unread-count',
        { token: accessToken },
      )

      const count = Number(response?.data?.unread_count) || 0

      // Something new arrived: refresh the list and related screens.
      if (count > previous) {
        queryClient.invalidateQueries({
          queryKey: ['notifications', 'list'],
        })

        RELATED_QUERY_KEYS.forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        )
      }

      return count
    },
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

// =========================================================
// MUTATIONS
// =========================================================

function markListItemsRead(queryClient, predicate) {
  const now = new Date().toISOString()

  queryClient.setQueriesData(
    { queryKey: ['notifications', 'list'] },
    (current) =>
      Array.isArray(current)
        ? current.map((notification) =>
            predicate(notification)
              ? { ...notification, is_read: true, read_at: now }
              : notification,
          )
        : current,
  )
}

export function useMarkNotificationRead() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId) =>
      apiRequest(`/notifications/${notificationId}/read`, {
        token: accessToken,
        method: 'PATCH',
      }),

    // Optimistic: dot disappears and badge drops immediately.
    onMutate: (notificationId) => {
      markListItemsRead(
        queryClient,
        (notification) =>
          getNotificationId(notification) === notificationId,
      )

      queryClient.setQueryData(
        notificationKeys.unreadCount,
        (count = 0) => Math.max(count - 1, 0),
      )
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiRequest('/notifications/read-all', {
        token: accessToken,
        method: 'PATCH',
      }),

    onMutate: () => {
      markListItemsRead(queryClient, () => true)
      queryClient.setQueryData(notificationKeys.unreadCount, 0)
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      })
    },
  })
}

export function useDeleteNotification() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId) =>
      apiRequest(`/notifications/${notificationId}`, {
        token: accessToken,
        method: 'DELETE',
      }),

    onMutate: (notificationId) => {
      queryClient.setQueriesData(
        { queryKey: ['notifications', 'list'] },
        (current) =>
          Array.isArray(current)
            ? current.filter(
                (notification) =>
                  getNotificationId(notification) !== notificationId,
              )
            : current,
      )
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      })
    },
  })
}