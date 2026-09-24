const deepseek = require('../../config/deepseek')

const MODEL_NAME = 'deepseek-flash'

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

const requestDeepSeek = async (messages) => {
  if (!deepseek) {
    const error = new Error(
      'DeepSeek is not configured'
    )

    error.code = 'AI_NOT_CONFIGURED'

    throw error
  }

  const response = await fetch(
    deepseek.apiUrl,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization:
          `Bearer ${deepseek.apiKey}`,
      },

      body: JSON.stringify({
        model: MODEL_NAME,
        messages,

        thinking: {
          type: 'disabled',
        },

        stream: false,
        max_tokens: 1000,
      }),
    }
  )

  if (!response.ok) {
    let providerMessage = ''

    try {
      const payload =
        await response.json()

      providerMessage =
        payload?.error?.message || ''
    } catch {
      providerMessage = ''
    }

    const error = new Error(
      providerMessage ||
        `DeepSeek request failed with status ${response.status}`
    )

    error.status = response.status

    throw error
  }

  const payload = await response.json()

  const reply =
    payload?.choices?.[0]?.message?.content

  if (
    !reply ||
    typeof reply !== 'string' ||
    !reply.trim()
  ) {
    const error = new Error(
      'DeepSeek returned an empty response'
    )

    error.code = 'AI_EMPTY_RESPONSE'

    throw error
  }

  return reply.trim()
}

const generate = async (messages) => {
  let lastError = null

  for (
    let attempt = 1;
    attempt <= MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await requestDeepSeek(messages)
    } catch (error) {
      lastError = error

      const shouldRetry =
        isRetryableError(error) &&
        attempt < MAX_GENERATION_ATTEMPTS

      if (!shouldRetry) {
        throw error
      }

      console.warn(
        `DeepSeek request temporarily unavailable. Retrying (${attempt + 1}/${MAX_GENERATION_ATTEMPTS})...`
      )

      await wait(RETRY_DELAY_MS)
    }
  }

  throw lastError
}

module.exports = {
  generate,
}