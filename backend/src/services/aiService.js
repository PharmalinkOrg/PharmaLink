const gemini = require('../config/gemini')
const customerAssistantPrompt = require('../prompts/customerAssistantPrompt')

const MODEL_NAME = 'gemini-3.6-flash'

const generateCustomerReply = async (message) => {
  if (!gemini) {
    const error = new Error('Gemini is not configured')
    error.code = 'AI_NOT_CONFIGURED'
    throw error
  }

  try {
    const response = await gemini.models.generateContent({
      model: MODEL_NAME,
      contents: message,
      config: {
        systemInstruction: customerAssistantPrompt,
      },
    })

    const reply = response.text

    if (!reply || typeof reply !== 'string' || !reply.trim()) {
      const error = new Error('Gemini returned an empty response')
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