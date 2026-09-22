const {
  generateCustomerReply,
} = require('../services/aiService')

const MAX_MESSAGE_LENGTH = 2000

const chat = async (req, res) => {
  try {
    const { message } = req.body

    // --------------------------------------------------
    // Validate message
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Generate PharmaLink Assistant response
    // --------------------------------------------------

    const reply = await generateCustomerReply(trimmedMessage)

    // --------------------------------------------------
    // Return response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      data: {
        reply,
      },
    })
  } catch (error) {
    console.error('AI controller error:', error)

    // --------------------------------------------------
    // Gemini is not configured
    // --------------------------------------------------

    if (error.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message: 'PharmaLink Assistant is currently unavailable',
      })
    }

    // --------------------------------------------------
    // Gemini returned an invalid/empty response
    // --------------------------------------------------

    if (error.code === 'AI_EMPTY_RESPONSE') {
      return res.status(502).json({
        success: false,
        message:
          'PharmaLink Assistant could not generate a response. Please try again.',
      })
    }

    // --------------------------------------------------
    // Gemini/provider failure
    // --------------------------------------------------

    if (error.code === 'AI_SERVICE_ERROR') {
      return res.status(503).json({
        success: false,
        message:
          'PharmaLink Assistant is temporarily unavailable. Please try again later.',
      })
    }

    // --------------------------------------------------
    // Unexpected server error
    // --------------------------------------------------

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred',
    })
  }
}

module.exports = {
  chat,
}