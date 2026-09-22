const supabaseAdmin = require('../config/supabaseAdmin')

const VALID_SENDERS = ['CUSTOMER', 'ASSISTANT', 'SYSTEM']

const VALID_MESSAGE_TYPES = [
  'GENERAL',
  'FAQ',
  'NAVIGATION',
  'MEDICINE_INFORMATION',
  'RESERVATION_HELP',
  'PRESCRIPTION_HELP',
  'REQUEST_HELP',
  'PLATFORM_INQUIRY',
]

/**
 * Create a new AI conversation for a customer.
 */
const createConversation = async (customerId, title = null) => {
  if (!customerId) {
    const error = new Error('Customer ID is required')
    error.code = 'INVALID_CUSTOMER_ID'
    throw error
  }

  const { data, error } = await supabaseAdmin
    .from('ai_conversations')
    .insert({
      customer_id: customerId,
      title,
      status: 'ACTIVE',
    })
    .select(
      `
        conversation_id,
        customer_id,
        title,
        status,
        started_at,
        last_message_at,
        created_at,
        updated_at
      `
    )
    .single()

  if (error) {
    console.error('Create AI conversation error:', error)

    const serviceError = new Error(
      'Failed to create AI conversation'
    )

    serviceError.code = 'AI_CONVERSATION_CREATE_ERROR'
    throw serviceError
  }

  return data
}

/**
 * Get one conversation belonging to a specific customer.
 *
 * Filtering by both conversation_id and customer_id prevents
 * one customer from accessing another customer's conversation.
 */
const getConversationForCustomer = async (
  conversationId,
  customerId
) => {
  if (!conversationId || !customerId) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('ai_conversations')
    .select(
      `
        conversation_id,
        customer_id,
        title,
        status,
        started_at,
        last_message_at,
        created_at,
        updated_at
      `
    )
    .eq('conversation_id', conversationId)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) {
    console.error('Get AI conversation error:', error)

    const serviceError = new Error(
      'Failed to retrieve AI conversation'
    )

    serviceError.code = 'AI_CONVERSATION_FETCH_ERROR'
    throw serviceError
  }

  return data
}

/**
 * Save a message to an existing AI conversation.
 */
const saveMessage = async ({
  conversationId,
  sender,
  message,
  messageType = 'GENERAL',
  medicineId = null,
}) => {
  if (!conversationId) {
    const error = new Error('Conversation ID is required')
    error.code = 'INVALID_CONVERSATION_ID'
    throw error
  }

  if (!VALID_SENDERS.includes(sender)) {
    const error = new Error('Invalid AI message sender')
    error.code = 'INVALID_AI_MESSAGE_SENDER'
    throw error
  }

  if (!VALID_MESSAGE_TYPES.includes(messageType)) {
    const error = new Error('Invalid AI message type')
    error.code = 'INVALID_AI_MESSAGE_TYPE'
    throw error
  }

  if (typeof message !== 'string' || !message.trim()) {
    const error = new Error('AI message cannot be empty')
    error.code = 'INVALID_AI_MESSAGE'
    throw error
  }

  const { data, error } = await supabaseAdmin
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      sender,
      message: message.trim(),
      message_type: messageType,
      medicine_id: medicineId,
    })
    .select(
      `
        message_id,
        conversation_id,
        sender,
        message,
        message_type,
        medicine_id,
        created_at
      `
    )
    .single()

  if (error) {
    console.error('Save AI message error:', error)

    const serviceError = new Error(
      'Failed to save AI message'
    )

    serviceError.code = 'AI_MESSAGE_SAVE_ERROR'
    throw serviceError
  }

  const timestamp = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('ai_conversations')
    .update({
      last_message_at: timestamp,
      updated_at: timestamp,
    })
    .eq('conversation_id', conversationId)

  if (updateError) {
    console.error(
      'Update AI conversation timestamp error:',
      updateError
    )
  }

  return data
}

/**
 * Retrieve messages belonging to a conversation.
 *
 * The caller must verify conversation ownership before calling
 * this function.
 */
const getConversationMessages = async (
  conversationId,
  limit = 20
) => {
  if (!conversationId) {
    return []
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    50
  )

  const { data, error } = await supabaseAdmin
    .from('ai_messages')
    .select(
      `
        message_id,
        conversation_id,
        sender,
        message,
        message_type,
        medicine_id,
        created_at
      `
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('Get AI messages error:', error)

    const serviceError = new Error(
      'Failed to retrieve AI messages'
    )

    serviceError.code = 'AI_MESSAGES_FETCH_ERROR'
    throw serviceError
  }

  return (data || []).reverse()
}

/**
 * Get all AI conversations belonging to a customer.
 */
const getCustomerConversations = async (customerId) => {
  if (!customerId) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('ai_conversations')
    .select(`
      conversation_id,
      customer_id,
      title,
      status,
      started_at,
      last_message_at,
      created_at,
      updated_at
    `)
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('Get customer AI conversations error:', error)

    const serviceError = new Error(
      'Failed to retrieve AI conversations'
    )
    serviceError.code = 'AI_CONVERSATIONS_FETCH_ERROR'

    throw serviceError
  }

  return data || []
}

/**
 * Get one customer-owned conversation together with its messages.
 */
const getConversationWithMessages = async (
  conversationId,
  customerId
) => {
  const conversation = await getConversationForCustomer(
    conversationId,
    customerId
  )

  if (!conversation) {
    return null
  }

  const messages = await getConversationMessages(
    conversationId,
    50
  )

  return {
    ...conversation,
    messages,
  }
}

/**
 * Close an AI conversation belonging to a customer.
 */
const closeConversation = async (
  conversationId,
  customerId
) => {
  if (!conversationId || !customerId) {
    return null
  }

  /*
   * First verify ownership.
   */
  const conversation = await getConversationForCustomer(
    conversationId,
    customerId
  )

  if (!conversation) {
    return null
  }

  /*
   * If already closed, return it without performing
   * another database update.
   */
  if (conversation.status === 'CLOSED') {
    return conversation
  }

  const timestamp = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('ai_conversations')
    .update({
      status: 'CLOSED',
      updated_at: timestamp,
    })
    .eq('conversation_id', conversationId)
    .eq('customer_id', customerId)
    .select(`
      conversation_id,
      customer_id,
      title,
      status,
      started_at,
      last_message_at,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    console.error('Close AI conversation error:', error)

    const serviceError = new Error(
      'Failed to close AI conversation'
    )

    serviceError.code = 'AI_CONVERSATION_CLOSE_ERROR'

    throw serviceError
  }

  return data
}

module.exports = {
  createConversation,
  getConversationForCustomer,
  saveMessage,
  getConversationMessages,
  getCustomerConversations,
  getConversationWithMessages,
  closeConversation,
}