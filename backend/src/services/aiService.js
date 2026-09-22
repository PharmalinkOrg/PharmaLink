const gemini = require('../config/gemini')
const customerAssistantPrompt = require('../prompts/customerAssistantPrompt')

const MODEL_NAME = 'gemini-3.6-flash'

const buildConversationContents = (
  history = [],
  currentMessage,
  knowledge = [],
  liveDataContext = null
) => {
  const contents = []

  /*
   * Add verified PharmaLink knowledge as context.
   *
   * This is kept separate from the permanent system prompt.
   */
  if (Array.isArray(knowledge) && knowledge.length > 0) {
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

    contents.push({
      role: 'user',
      parts: [
        {
          text: `
VERIFIED PHARMALINK KNOWLEDGE

The following information was retrieved from PharmaLink's approved knowledge base.

Use it only when it is relevant to the customer's question.

Do not invent additional PharmaLink facts beyond this information.

Do not treat this information as medical advice.

${knowledgeContext}
          `.trim(),
        },
      ],
    })

    /*
     * Gemini requires normal conversational role progression.
     * This model acknowledgement separates retrieved context
     * from the actual customer conversation.
     */
    contents.push({
      role: 'model',
      parts: [
        {
          text:
            'Understood. I will use the verified PharmaLink knowledge when relevant and will not invent unsupported platform information.',
        },
      ],
    })
  }

  /* ============================================================
     VERIFIED LIVE PHARMALINK DATA
  ============================================================ */

  if (
    liveDataContext &&
    liveDataContext.dataType &&
    liveDataContext.data !== null
  ) {
    const liveDataPayload = {
      intent: liveDataContext.intent,
      dataType: liveDataContext.dataType,
      entityId: liveDataContext.entityId || null,
      data: liveDataContext.data,
      metadata: liveDataContext.metadata || {},
    }

    contents.push({
      role: 'user',
      parts: [
        {
          text: `
VERIFIED LIVE PHARMALINK DATA

The following data was retrieved by PharmaLink's controlled backend for the authenticated customer.

Rules for using this data:

1. Treat this data as the only verified live PharmaLink data available for this message.

2. Only state account-specific statuses, pharmacy availability, quantities, or prices that are explicitly present in this data.

3. Never invent missing values.

4. Never infer that a medicine is unavailable everywhere merely because the returned search result is empty.

5. If no matching record was returned, explain that PharmaLink did not return a matching record for this request.

6. Do not claim that you performed an action. This data access is read-only.

7. Do not expose internal database fields, implementation details, authentication details, customer IDs, or backend architecture.

8. Do not expose prescription images, storage paths, signed URLs, authentication tokens, or private information.

9. Reservation, prescription, and medicine-request information belongs only to the authenticated customer whose data was retrieved by the backend.

10. Medical safety rules still apply. Live medicine data does not authorize diagnosis, treatment recommendations, prescribing, dosage changes, or individualized medicine selection.

LIVE DATA:
${JSON.stringify(liveDataPayload, null, 2)}
        `.trim(),
        },
      ],
    })

    contents.push({
      role: 'model',
      parts: [
        {
          text:
            'Understood. I will use only the verified live PharmaLink data provided for live account, availability, quantity, price, and status claims, while following the medical safety rules.',
        },
      ],
    })
  }

  /*
   * Add previous conversation messages.
   */
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
        parts: [{ text: message }],
      })
    }

    if (item.sender === 'ASSISTANT') {
      contents.push({
        role: 'model',
        parts: [{ text: message }],
      })
    }
  }

  /*
   * Add the customer's current message last.
   */
  contents.push({
    role: 'user',
    parts: [{ text: currentMessage }],
  })

  return contents
}

const generateCustomerReply = async (
  message,
  conversationHistory = [],
  knowledge = [],
  liveDataContext = null
) => {
  if (!gemini) {
    const error = new Error('Gemini is not configured')
    error.code = 'AI_NOT_CONFIGURED'
    throw error
  }

  try {
    const contents = buildConversationContents(
      conversationHistory,
      message,
      knowledge,
      liveDataContext
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