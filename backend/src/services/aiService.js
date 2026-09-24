const customerAssistantPrompt = require(
  '../prompts/customerAssistantPrompt'
)

const SUPPORTED_PROVIDERS = [
  'deepseek',
  'gemini',
]

/* ============================================================
   PROVIDER
============================================================ */

const getProviderName = () => {
  return (
    process.env.AI_PROVIDER ||
    'deepseek'
  )
    .trim()
    .toLowerCase()
}

const getProvider = () => {
  const providerName = getProviderName()

  /*
   * Require providers lazily.
   *
   * This prevents Gemini configuration from being loaded when
   * DeepSeek is selected, and vice versa.
   */
  if (providerName === 'deepseek') {
    return {
      name: 'deepseek',

      provider: require(
        './aiProviders/deepseekProvider'
      ),
    }
  }

  if (providerName === 'gemini') {
    return {
      name: 'gemini',

      provider: require(
        './aiProviders/geminiProvider'
      ),
    }
  }

  const error = new Error(
    `Unsupported AI provider: ${providerName}`
  )

  error.code = 'AI_NOT_CONFIGURED'

  throw error
}

/* ============================================================
   MESSAGE BUILDER
============================================================ */

const buildConversationMessages = (
  history = [],
  currentMessage,
  knowledge = [],
  liveDataContext = null
) => {
  const messages = []

  /* ==========================================================
     VERIFIED PHARMALINK KNOWLEDGE
  ========================================================== */

  if (
    Array.isArray(knowledge) &&
    knowledge.length > 0
  ) {
    const knowledgeContext = knowledge
      .map((item, index) => {
        return [
          `Knowledge ${index + 1}`,
          `Category: ${item.category}`,
          `Question: ${item.question}`,
          `Answer: ${item.answer}`,
        ].join('\n')
      })
      .join('\n\n')

    messages.push({
      role: 'system',

      content: `
VERIFIED PHARMALINK KNOWLEDGE

The following information was retrieved from PharmaLink's
approved knowledge base.

Use it only when it is relevant to the customer's question.

Do not invent additional PharmaLink facts beyond this
information.

Do not treat this information as medical advice.

${knowledgeContext}
      `.trim(),
    })
  }

  /* ==========================================================
     VERIFIED LIVE PHARMALINK DATA
  ========================================================== */

  if (
    liveDataContext &&
    liveDataContext.dataType &&
    liveDataContext.data !== null
  ) {
    const liveDataPayload = {
      intent: liveDataContext.intent,

      dataType:
        liveDataContext.dataType,

      entityId:
        liveDataContext.entityId ||
        null,

      data:
        liveDataContext.data,

      metadata:
        liveDataContext.metadata || {},
    }

    messages.push({
      role: 'system',

      content: `
VERIFIED LIVE PHARMALINK DATA

The following data was retrieved by PharmaLink's controlled
backend for the authenticated customer.

Rules for using this data:

1. Treat this data as the only verified live PharmaLink data
available for this message.

2. Only state account-specific statuses, pharmacy
availability, quantities, or prices explicitly present in
this data.

3. Never invent missing values.

4. Never infer that a medicine is unavailable everywhere
merely because a returned search result is empty.

5. If no matching record was returned, explain that
PharmaLink did not return a matching record for this request.

6. Do not claim that you performed an action. This data
access is read-only.

7. Do not expose internal database fields, implementation
details, authentication details, customer IDs, or backend
architecture.

8. Do not expose prescription images, storage paths, signed
URLs, authentication tokens, or private information.

9. Reservation, prescription, and medicine-request
information belongs only to the authenticated customer whose
data was retrieved by the backend.

10. Medical safety rules still apply. Live medicine data
does not authorize diagnosis, treatment recommendations,
prescribing, dosage changes, or individualized medicine
selection.

11. Check metadata.resultState before interpreting the
result.

12. RESULT_FOUND or RESULTS_FOUND means the controlled query
returned matching PharmaLink data.

13. NOT_FOUND means the requested customer-owned record was
not returned. Do not claim why it was not returned.

14. NO_RESULTS means the controlled search returned no
matching rows. It does not prove that the medicine or
pharmacy does not exist outside the searched PharmaLink data.

15. NOT_APPLICABLE means no live-data result was required
for this message.

16. If a customer asks about a specific private record and
the backend returns NOT_FOUND, say PharmaLink could not find
that record for their authenticated account. Do not reveal
whether a record with that ID belongs to another customer.

LIVE DATA:

${JSON.stringify(
  liveDataPayload,
  null,
  2
)}
      `.trim(),
    })
  }

  /* ==========================================================
     CONVERSATION HISTORY
  ========================================================== */

  for (const item of history) {
    if (
      !item ||
      typeof item.message !== 'string'
    ) {
      continue
    }

    const message = item.message.trim()

    if (!message) {
      continue
    }

    if (item.sender === 'CUSTOMER') {
      messages.push({
        role: 'user',
        content: message,
      })
    }

    if (item.sender === 'ASSISTANT') {
      messages.push({
        role: 'assistant',
        content: message,
      })
    }
  }

  messages.push({
    role: 'user',
    content: currentMessage,
  })

  return messages
}

/* ============================================================
   ERROR NORMALIZATION
============================================================ */

const normalizeProviderError = (
  error,
  providerName
) => {
  if (
    error?.code ===
      'AI_NOT_CONFIGURED' ||
    error?.code ===
      'AI_EMPTY_RESPONSE'
  ) {
    return error
  }

  const status = Number(
    error?.status ||
    error?.response?.status
  )

  if (status === 429) {
    console.error(
      `${providerName} rate limit reached:`,
      error.message
    )

    const serviceError = new Error(
      'PharmaLink AI has reached its current usage limit'
    )

    serviceError.code =
      'AI_QUOTA_EXHAUSTED'

    return serviceError
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    console.error(
      `${providerName} temporarily unavailable:`,
      error.message
    )

    const serviceError = new Error(
      'PharmaLink AI is temporarily unavailable'
    )

    serviceError.code =
      'AI_SERVICE_UNAVAILABLE'

    return serviceError
  }

  if (
    status === 401 ||
    status === 403
  ) {
    console.error(
      `${providerName} authentication error:`,
      error.message
    )

    const serviceError = new Error(
      'PharmaLink AI provider is not configured correctly'
    )

    serviceError.code =
      'AI_NOT_CONFIGURED'

    return serviceError
  }

  console.error(
    `${providerName} API error:`,
    error
  )

  const serviceError = new Error(
    'PharmaLink AI service failed to generate a response'
  )

  serviceError.code =
    'AI_SERVICE_ERROR'

  return serviceError
}

/* ============================================================
   GENERATE CUSTOMER REPLY
============================================================ */

const generateCustomerReply = async (
  message,
  conversationHistory = [],
  knowledge = [],
  liveDataContext = null
) => {
  let providerInfo = null

  try {
    providerInfo = getProvider()

    const messages =
      buildConversationMessages(
        conversationHistory,
        message,
        knowledge,
        liveDataContext
      )

    /*
     * Gemini receives the permanent system prompt separately.
     *
     * DeepSeek receives it as the first system message.
     */
    if (
      providerInfo.name === 'deepseek'
    ) {
      messages.unshift({
        role: 'system',
        content:
          customerAssistantPrompt,
      })

      return await providerInfo.provider.generate(
        messages
      )
    }

    if (
      providerInfo.name === 'gemini'
    ) {
      return await providerInfo.provider.generate(
        messages,
        customerAssistantPrompt
      )
    }

    const error = new Error(
      'AI provider is not configured'
    )

    error.code = 'AI_NOT_CONFIGURED'

    throw error
  } catch (error) {
    if (
      error?.code ===
        'AI_QUOTA_EXHAUSTED' ||
      error?.code ===
        'AI_SERVICE_UNAVAILABLE' ||
      error?.code ===
        'AI_SERVICE_ERROR'
    ) {
      throw error
    }

    throw normalizeProviderError(
      error,
      providerInfo?.name ||
        getProviderName()
    )
  }
}

module.exports = {
  generateCustomerReply,
}