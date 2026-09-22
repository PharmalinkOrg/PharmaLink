const { generateCustomerReply } = require('../services/aiService')

const {
  createConversation,
  getConversationForCustomer,
  saveMessage,
  getConversationMessages,
  getCustomerConversations,
  getConversationWithMessages,
  closeConversation,
} = require('../services/aiConversationService')

const MAX_MESSAGE_LENGTH = 2000

const isValidId = (value) => {
  const number = Number(value)

  return Number.isInteger(number) && number > 0
}

const createConversationTitle = (message) => {
  const cleanMessage = message.replace(/\s+/g, ' ').trim()

  if (cleanMessage.length <= 60) {
    return cleanMessage
  }

  return `${cleanMessage.slice(0, 57)}...`
}

const chat = async (req, res) => {
  try {
    const { message, conversationId } = req.body

    /*
     * Validate message.
     */
    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message must be a string',
      })
    }

    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      })
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message must not exceed ${MAX_MESSAGE_LENGTH} characters`,
      })
    }

    /*
     * authenticateUser + loadPharmaUser have already loaded
     * the authenticated PharmaLink customer.
     *
     * Never accept customer_id from the frontend.
     */
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer account could not be identified',
      })
    }

    let conversation = null

    /*
     * If the frontend supplied a conversationId, verify that the
     * conversation belongs to the authenticated customer.
     */
    if (
      conversationId !== undefined &&
      conversationId !== null
    ) {
      if (!isValidId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        })
      }

      conversation = await getConversationForCustomer(
        Number(conversationId),
        customerId
      )

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        })
      }

      if (conversation.status !== 'ACTIVE') {
        return res.status(409).json({
          success: false,
          message: 'This conversation is closed',
        })
      }
    } else {
      /*
       * No conversationId means this is the first message
       * in a new conversation.
       */
      conversation = await createConversation(
        customerId,
        createConversationTitle(trimmedMessage)
      )
    }

    /*
     * Load previous conversation history BEFORE saving the
     * customer's newest message.
     *
     * This prevents the current message from being sent to
     * Gemini twice.
     */
    const conversationHistory =
      await getConversationMessages(
        conversation.conversation_id,
        20
      )

    /*
     * Persist the customer's newest message.
     */
    await saveMessage({
      conversationId: conversation.conversation_id,
      sender: 'CUSTOMER',
      message: trimmedMessage,
      messageType: 'GENERAL',
    })

    /*
     * Generate a response using the previous conversation
     * messages plus the customer's newest message.
     */
    const reply = await generateCustomerReply(
      trimmedMessage,
      conversationHistory
    )

    /*
     * Persist the assistant response.
     */
    await saveMessage({
      conversationId: conversation.conversation_id,
      sender: 'ASSISTANT',
      message: reply,
      messageType: 'GENERAL',
    })

    return res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.conversation_id,
        reply,
      },
    })
  } catch (error) {
    console.error('AI controller error:', error)

    if (error.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message: 'PharmaLink Assistant is currently unavailable',
      })
    }

    if (error.code === 'AI_EMPTY_RESPONSE') {
      return res.status(502).json({
        success: false,
        message:
          'PharmaLink Assistant could not generate a response. Please try again.',
      })
    }

    if (error.code === 'AI_SERVICE_ERROR') {
      return res.status(503).json({
        success: false,
        message:
          'PharmaLink Assistant is temporarily unavailable. Please try again later.',
      })
    }

    if (
      error.code === 'AI_CONVERSATION_CREATE_ERROR' ||
      error.code === 'AI_CONVERSATION_FETCH_ERROR' ||
      error.code === 'AI_MESSAGE_SAVE_ERROR'
    ) {
      return res.status(500).json({
        success: false,
        message:
          'The conversation could not be saved. Please try again.',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred',
    })
  }
}

const listConversations = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer account could not be identified',
      })
    }

    const conversations =
      await getCustomerConversations(customerId)

    return res.status(200).json({
      success: true,
      data: {
        conversations,
      },
    })
  } catch (error) {
    console.error('List AI conversations error:', error)

    return res.status(500).json({
      success: false,
      message: 'AI conversations could not be retrieved',
    })
  }
}

const getConversation = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id
    const { conversationId } = req.params

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer account could not be identified',
      })
    }

    if (!isValidId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      })
    }

    const conversation =
      await getConversationWithMessages(
        Number(conversationId),
        customerId
      )

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation,
      },
    })
  } catch (error) {
    console.error('Get AI conversation error:', error)

    return res.status(500).json({
      success: false,
      message: 'AI conversation could not be retrieved',
    })
  }
}

const closeCustomerConversation = async (req, res) => {
  try {
    const customerId = req.pharmaUser?.user_id
    const { conversationId } = req.params

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer account could not be identified',
      })
    }

    if (!isValidId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      })
    }

    const conversation = await closeConversation(
      Number(conversationId),
      customerId
    )

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation,
      },
    })
  } catch (error) {
    console.error('Close AI conversation error:', error)

    if (error.code === 'AI_CONVERSATION_CLOSE_ERROR') {
      return res.status(500).json({
        success: false,
        message:
          'The conversation could not be closed. Please try again.',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred',
    })
  }
}

module.exports = {
  chat,
  listConversations,
  getConversation,
  closeCustomerConversation,
}