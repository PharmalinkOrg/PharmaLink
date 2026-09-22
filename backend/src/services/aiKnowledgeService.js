const supabaseAdmin = require('../config/supabaseAdmin')

const MAX_KNOWLEDGE_RESULTS = 5

/**
 * Normalize text so matching is case-insensitive
 * and less affected by punctuation.
 */
const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split normalized text into individual searchable words.
 */
const tokenize = (value) => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return []
  }

  return normalized
    .split(' ')
    .filter((word) => word.length >= 2)
}

/**
 * Calculate how relevant one knowledge record is
 * to the customer's message.
 *
 * Higher scores indicate stronger matches.
 */
const calculateKnowledgeScore = (message, knowledge) => {
  const normalizedMessage = normalizeText(message)
  const messageTokens = new Set(tokenize(message))

  if (!normalizedMessage) {
    return 0
  }

  let score = 0

  const normalizedQuestion = normalizeText(
    knowledge.question || ''
  )

  /*
   * Strong match if the stored question closely matches
   * the customer's message.
   */
  if (
    normalizedQuestion &&
    normalizedMessage === normalizedQuestion
  ) {
    score += 20
  } else if (
    normalizedQuestion &&
    (
      normalizedMessage.includes(normalizedQuestion) ||
      normalizedQuestion.includes(normalizedMessage)
    )
  ) {
    score += 10
  }

  /*
   * Compare words from the stored question.
   */
  const questionTokens = tokenize(
    knowledge.question || ''
  )

  for (const token of questionTokens) {
    if (messageTokens.has(token)) {
      score += 1
    }
  }

  /*
   * Keywords are intentionally weighted more heavily
   * because they are manually approved retrieval terms.
   */
  const keywords = Array.isArray(knowledge.keywords)
    ? knowledge.keywords
    : []

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword)

    if (!normalizedKeyword) {
      continue
    }

    /*
     * Exact phrase match.
     */
    if (normalizedMessage.includes(normalizedKeyword)) {
      score += 5
      continue
    }

    /*
     * Partial token match for multi-word keywords.
     */
    const keywordTokens = tokenize(normalizedKeyword)

    for (const token of keywordTokens) {
      if (messageTokens.has(token)) {
        score += 1
      }
    }
  }

  return score
}

/**
 * Search active PharmaLink knowledge records relevant
 * to a customer's message.
 */
const searchKnowledge = async (
  message,
  limit = MAX_KNOWLEDGE_RESULTS
) => {
  if (typeof message !== 'string' || !message.trim()) {
    return []
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || MAX_KNOWLEDGE_RESULTS, 1),
    MAX_KNOWLEDGE_RESULTS
  )

  /*
   * Only active knowledge is eligible for AI retrieval.
   */
  const { data, error } = await supabaseAdmin
    .from('ai_knowledge')
    .select(`
      knowledge_id,
      category,
      question,
      answer,
      keywords
    `)
    .eq('is_active', true)

  if (error) {
    console.error(
      'Search AI knowledge error:',
      error
    )

    const serviceError = new Error(
      'Failed to retrieve PharmaLink knowledge'
    )

    serviceError.code = 'AI_KNOWLEDGE_FETCH_ERROR'

    throw serviceError
  }

  const scoredKnowledge = (data || [])
    .map((knowledge) => ({
      ...knowledge,
      relevanceScore: calculateKnowledgeScore(
        message,
        knowledge
      ),
    }))
    .filter(
      (knowledge) => knowledge.relevanceScore > 0
    )
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore
    )
    .slice(0, safeLimit)

  return scoredKnowledge
}

module.exports = {
  searchKnowledge,
}