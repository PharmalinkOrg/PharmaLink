const gemini = require('../config/gemini')
const customerAssistantPrompt = require('../prompts/customerAssistantPrompt')

const MODEL_NAME = 'gemini-3.6-flash'

/**
 * Convert PharmaLink stored messages into Gemini conversation history.
 *
 * CUSTOMER  -> user
 * ASSISTANT -> model
 *
 * SYSTEM messages are intentionally excluded because the official
 * PharmaLink system prompt is supplied separately through
 * systemInstruction.
 */
const buildConversationContents = (history = [], currentMessage) => {
  const contents = []

  for (const item of history) {
    if (!item || typeof item.message !== 'string') {
      continue
    }

    const message = item.message.trim()

    if (!message) {
      continue
    }

    if (item.sender === 'CUSTOMER') {
      contents.push({
        role: 'user',
        parts: [
          {
            text: message,
          },
        ],
      })
    }

    if (item.sender === 'ASSISTANT') {
      contents.push({
        role: 'model',
        parts: [
          {
            text: message,
          },
        ],
      })
    }
  }

  /*
   * Add the customer's newest message after the stored history.
   */
  contents.push({
    role: 'user',
    parts: [
      {
        text: currentMessage,
      },
    ],
  })

  return contents
}

const generateCustomerReply = async (
  message,
  conversationHistory = []
) => {
  if (!gemini) {
    const error = new Error('Gemini is not configured')
    error.code = 'AI_NOT_CONFIGURED'
    throw error
  }

  try {
    const contents = buildConversationContents(
      conversationHistory,
      message
    )

    const response = await gemini.models.generateContent({
      model: MODEL_NAME,

      contents,

      config: {
        systemInstruction: customerAssistantPrompt,
      },
    })

    const reply = response.text

    if (
      !reply ||
      typeof reply !== 'string' ||
      !reply.trim()
    ) {
      const error = new Error(
        'Gemini returned an empty response'
      )

      error.code = 'AI_EMPTY_RESPONSE'
      throw error
    }

    return reply.trim()
  } catch (error) {
    if (
      error.code === 'AI_NOT_CONFIGURED' ||
      error.code === 'AI_EMPTY_RESPONSE'
    ) {
      throw error
    }

    console.error('Gemini API error:', error)

    const serviceError = new Error(
      'PharmaLink AI service failed to generate a response'
    )

    serviceError.code = 'AI_SERVICE_ERROR'

    throw serviceError
  }
}

module.exports = {
  generateCustomerReply,
}