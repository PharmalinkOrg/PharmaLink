const supabaseAdmin = require('../config/supabaseAdmin')

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
 * Persist one complete customer/assistant exchange atomically.
 *
 * The PostgreSQL RPC guarantees that:
 * - the conversation belongs to the customer
 * - an existing conversation is ACTIVE
 * - both messages are inserted together
 * - conversation timestamps are updated
 * - a new conversation and its messages are committed together
 *
 * If any database operation fails, the entire operation rolls back.
 */
const saveExchangeAtomic = async ({
  customerId,
  conversationId = null,
  title = null,
  customerMessage,
  assistantMessage,
  customerMessageType = 'GENERAL',
  assistantMessageType = 'GENERAL',
}) => {
  if (
    !Number.isInteger(Number(customerId)) ||
    Number(customerId) <= 0
  ) {
    const error = new Error(
      'Customer ID is required'
    )

    error.code = 'INVALID_CUSTOMER_ID'

    throw error
  }

  if (
    conversationId !== null &&
    (
      !Number.isInteger(Number(conversationId)) ||
      Number(conversationId) <= 0
    )
  ) {
    const error = new Error(
      'Invalid conversation ID'
    )

    error.code = 'INVALID_CONVERSATION_ID'

    throw error
  }

  if (
    typeof customerMessage !== 'string' ||
    !customerMessage.trim()
  ) {
    const error = new Error(
      'Customer message cannot be empty'
    )

    error.code = 'INVALID_AI_MESSAGE'

    throw error
  }

  if (
    typeof assistantMessage !== 'string' ||
    !assistantMessage.trim()
  ) {
    const error = new Error(
      'Assistant message cannot be empty'
    )

    error.code = 'INVALID_AI_MESSAGE'

    throw error
  }

  if (
    !VALID_MESSAGE_TYPES.includes(
      customerMessageType
    ) ||
    !VALID_MESSAGE_TYPES.includes(
      assistantMessageType
    )
  ) {
    const error = new Error(
      'Invalid AI message type'
    )

    error.code = 'INVALID_AI_MESSAGE_TYPE'

    throw error
  }

  const { data, error } =
    await supabaseAdmin.rpc(
      'save_ai_exchange_atomic',
      {
        p_customer_id:
          Number(customerId),

        p_conversation_id:
          conversationId === null
            ? null
            : Number(conversationId),

        p_title:
          typeof title === 'string'
            ? title.trim() || null
            : null,

        p_customer_message:
          customerMessage.trim(),

        p_assistant_message:
          assistantMessage.trim(),

        p_customer_message_type:
          customerMessageType,

        p_assistant_message_type:
          assistantMessageType,
      }
    )

  if (error) {
    console.error(
      'Save AI exchange atomic error:',
      error
    )

    const message =
      String(error.message || '')

    const serviceError = new Error(
      'Failed to save AI conversation exchange'
    )

    if (
      message.includes(
        'AI_CONVERSATION_NOT_FOUND'
      )
    ) {
      serviceError.code =
        'AI_CONVERSATION_NOT_FOUND'
    } else if (
      message.includes(
        'AI_CONVERSATION_CLOSED'
      )
    ) {
      serviceError.code =
        'AI_CONVERSATION_CLOSED'
    } else {
      serviceError.code =
        'AI_EXCHANGE_SAVE_ERROR'
    }

    throw serviceError
  }

  const result = Array.isArray(data)
    ? data[0]
    : data

  if (!result?.conversation_id) {
    const serviceError = new Error(
      'AI exchange did not return a conversation ID'
    )

    serviceError.code =
      'AI_EXCHANGE_SAVE_ERROR'

    throw serviceError
  }

  return {
    conversationId:
      result.conversation_id,

    customerMessageId:
      result.customer_message_id,

    assistantMessageId:
      result.assistant_message_id,
  }
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

  /*
   * Only return conversations that contain at least one
   * persisted message.
   *
   * This prevents legacy empty conversations created by
   * failed AI-provider requests from appearing in History.
   *
   * The ai_messages relation is used only to determine
   * whether the conversation contains messages. The actual
   * message contents are not returned to the conversation
   * list.
   */
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
      updated_at,
      ai_messages!inner (
        message_id
      )
    `)
    .eq('customer_id', customerId)
    .order('last_message_at', {
      ascending: false,
      nullsFirst: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    console.error(
      'Get customer AI conversations error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve AI conversations'
    )

    serviceError.code =
      'AI_CONVERSATIONS_FETCH_ERROR'

    throw serviceError
  }

  /*
   * Remove the relation used for filtering before returning
   * conversation metadata to the frontend.
   */
  return (data || []).map(
    ({ ai_messages, ...conversation }) =>
      conversation
  )
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
  getConversationForCustomer,
  saveExchangeAtomic,
  getConversationMessages,
  getCustomerConversations,
  getConversationWithMessages,
  closeConversation,
}