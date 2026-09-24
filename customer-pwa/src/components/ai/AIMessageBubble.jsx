import {
  ArrowRight,
  Bot,
  UserRound,
} from 'lucide-react'

import {
  getAINavigationRoute,
  isValidAINavigationAction,
} from '../../config/aiNavigation'

function AIMessageBubble({
  message,
  onNavigate,
}) {
  const isCustomer =
    message?.sender === 'CUSTOMER'

  const text =
    typeof message?.message === 'string'
      ? message.message
      : ''

  /*
   * Only assistant messages may display navigation actions.
   *
   * The action must also pass the frontend allowlist before
   * a button is rendered.
   */
  const action =
    !isCustomer &&
    isValidAINavigationAction(message?.action)
      ? message.action
      : null

  const route = action
    ? getAINavigationRoute(action)
    : null

  if (!text) {
    return null
  }

  const handleActionClick = () => {
    if (!route || typeof onNavigate !== 'function') {
      return
    }

    onNavigate(route)
  }

  return (
    <div
      className={`flex gap-2.5 ${
        isCustomer
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      {!isCustomer && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Bot size={17} />
        </div>
      )}

      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[72%] ${
          isCustomer
            ? 'rounded-br-md bg-teal-700 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {text}
        </p>

        {action && route && (
          <button
            type="button"
            onClick={handleActionClick}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            <span>{action.label}</span>

            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {isCustomer && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <UserRound size={16} />
        </div>
      )}
    </div>
  )
}

export default AIMessageBubble