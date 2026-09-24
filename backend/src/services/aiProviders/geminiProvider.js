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
  status === 500 ||
  status === 502 ||
  status === 503 ||
  status === 504
)
}

/**
 * Convert provider-independent conversation messages
 * into Gemini's contents format.
 *
 * System messages are intentionally excluded here
 * because they are merged into Gemini's
 * systemInstruction separately.
 */
const convertMessagesForGemini = (messages) => {
  const contents = []

  for (const item of messages) {
    if (
      !item ||
      typeof item.content !== 'string'
    ) {
      continue
    }

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

/**
 * Build Gemini's complete system instruction.
 *
 * This preserves:
 * - the permanent PharmaLink Assistant prompt
 * - verified PharmaLink knowledge
 * - verified live PharmaLink data
 *
 * Dynamic system messages are produced by our
 * trusted backend. They are not supplied directly
 * by the customer.
 */
const buildSystemInstruction = (
  messages,
  baseSystemInstruction
) => {
  const sections = []

  if (
    typeof baseSystemInstruction === 'string' &&
    baseSystemInstruction.trim()
  ) {
    sections.push(
      baseSystemInstruction.trim()
    )
  }

  const dynamicSystemMessages = messages
    .filter(
      (item) =>
        item &&
        item.role === 'system' &&
        typeof item.content === 'string' &&
        item.content.trim()
    )
    .map((item) => item.content.trim())

  if (dynamicSystemMessages.length > 0) {
    sections.push(
      dynamicSystemMessages.join('\n\n')
    )
  }

  return sections.join('\n\n')
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

  const completeSystemInstruction =
    buildSystemInstruction(
      messages,
      systemInstruction
    )

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
            systemInstruction:
              completeSystemInstruction,
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