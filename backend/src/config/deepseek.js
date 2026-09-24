require('dotenv').config()

const DEEPSEEK_API_URL =
  'https://api.deepseek.com/chat/completions'

const getDeepSeekConfig = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    apiUrl: DEEPSEEK_API_URL,
  }
}

module.exports = getDeepSeekConfig()