const { GoogleGenAI } = require('@google/genai')

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.warn(
    'GEMINI_API_KEY is not configured. PharmaLink AI features will be unavailable.'
  )
}

const gemini = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null

module.exports = gemini