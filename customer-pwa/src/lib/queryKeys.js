export const queryKeys = {
  // Customer account
  profile: ['customer-profile'],

  // Partner pharmacies
  pharmacies: ['pharmacies'],

  // Medicines
  medicines: ['medicines'],
  availableMedicines: ['available-medicines'],
  medicineCategories: ['medicine-categories'],

    aiConversations: [
  'ai-conversations',
],

aiConversation: (
  conversationId,
) => [
  'ai-conversation',
  Number(conversationId),
],

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