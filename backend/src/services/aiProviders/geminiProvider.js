const gemini = require('../../config/gemini')

const MODEL_NAME = 'gemini-3.6-flash'

const MAX_GENERATION_ATTEMPTS = 2

const RETRY_DELAY_MS = 1200

const wait = (milliseconds) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  )

const isRetryableError = (error) => {
  const status = Number(
    error?.status ||
    error?.response?.status
  )

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  )
}

/*
 * Convert our provider-independent messages into
 * Gemini's contents format.
 */
const convertMessagesForGemini = (
  messages
) => {
  const contents = []

  for (const item of messages) {
    if (
      !item ||
      typeof item.content !== 'string'
    ) {
      continue
    }

    /*
     * System messages are handled separately by
     * aiService and should not become conversation
     * messages here.
     */
    if (item.role === 'system') {
      continue
    }

    if (item.role === 'user') {
      contents.push({
        role: 'user',
        parts: [
          {
            text: item.content,
          },
        ],
      })
    }

    if (item.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [
          {
            text: item.content,
          },
        ],
      })
    }
  }

  return contents
}

const generate = async (
  messages,
  systemInstruction
) => {
  if (!gemini) {
    const error = new Error(
      'Gemini is not configured'
    )

    error.code = 'AI_NOT_CONFIGURED'

    throw error
  }

  const contents =
    convertMessagesForGemini(messages)

  let lastError = null

  for (
    let attempt = 1;
    attempt <= MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await gemini.models.generateContent({
          model: MODEL_NAME,

          contents,

          config: {
            systemInstruction,
          },
        })

      const reply = response?.text

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
      lastError = error

      const shouldRetry =
        isRetryableError(error) &&
        attempt < MAX_GENERATION_ATTEMPTS

      if (!shouldRetry) {
        throw error
      }

      console.warn(
        `Gemini request temporarily unavailable. Retrying (${attempt + 1}/${MAX_GENERATION_ATTEMPTS})...`
      )

      await wait(RETRY_DELAY_MS)
    }
  }

  throw lastError
}

module.exports = {
  generate,
}