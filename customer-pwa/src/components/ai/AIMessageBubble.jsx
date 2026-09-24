import {
  ArrowRight,
  Bot,
  UserRound,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  getAINavigationRoute,
  isValidAINavigationAction,
} from '../../config/aiNavigation'

function AIMessageBubble({ message, onNavigate }) {
  const isCustomer = message?.sender === 'CUSTOMER'
  const text =
    typeof message?.message === 'string'
      ? message.message
      : ''

  const action =
    !isCustomer &&
    isValidAINavigationAction(message?.action)
      ? message.action
      : null

  const route = action
    ? getAINavigationRoute(action)
    : null

  if (!text) return null

  const handleActionClick = () => {
    if (!route || typeof onNavigate !== 'function') return
    onNavigate(route)
  }

  return (
    <div className={`ai-message-row ${isCustomer ? 'is-customer' : 'is-assistant'}`}>
      {!isCustomer && (
        <div className="ai-message-avatar ai-assistant-avatar">
          <Bot size={17} />
        </div>
      )}

      <div className={`ai-message-bubble ${isCustomer ? 'customer' : 'assistant'}`}>
        <div className="ai-message-markdown">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>

        {action && route && (
          <button
            type="button"
            onClick={handleActionClick}
            className="ai-message-action"
          >
            <span>{action.label}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {isCustomer && (
        <div className="ai-message-avatar ai-customer-avatar">
          <UserRound size={16} />
        </div>
      )}
    </div>
  )
}

export default AIMessageBubble
