// Centralized TanStack Query keys for PharmaLink Customer PWA.
//
// Keep query keys here so pages and hooks use the same cache entries.
// This makes invalidation, refetching, and cache updates predictable.

export const queryKeys = {
  // Customer account
  profile: ['customer-profile'],

  // Partner pharmacies
  pharmacies: ['pharmacies'],

  // Medicines and search
  medicines: ['medicines'],

  // Customer reservations
  reservations: ['customer-reservations'],

  // Customer prescriptions
  prescriptions: ['customer-prescriptions'],

  // Customer medicine requests
  medicineRequests: ['customer-medicine-requests'],

  // Customer notifications
  notifications: ['customer-notifications'],

  // Notification unread count
  notificationUnreadCount: ['notification-unread-count'],
}