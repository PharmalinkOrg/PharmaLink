import { apiRequest } from '../lib/api'

export async function sendMessage(
  message,
  conversationId = null
) {
  const trimmedMessage = message.trim()

  const body = {
    message: trimmedMessage,
  }

  if (conversationId) {
    body.conversationId = conversationId
  }

  const response = await apiRequest('/ai/chat', {
    method: 'POST',
    body,
  })

  return response.data
}

export async function getConversations() {
  const response = await apiRequest(
    '/ai/conversations'
  )

  return response.data?.conversations ?? []
}

export async function getConversation(
  conversationId
) {
  const response = await apiRequest(
    `/ai/conversations/${conversationId}`
  )

  return response.data?.conversation ?? null
}

export async function closeConversation(
  conversationId
) {
  const response = await apiRequest(
    `/ai/conversations/${conversationId}/close`,
    {
      method: 'PATCH',
    }
  )

  return response.data?.conversation ?? null
}