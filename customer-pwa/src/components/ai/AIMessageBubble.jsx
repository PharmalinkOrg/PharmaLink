import { Bot, UserRound } from 'lucide-react'

function AIMessageBubble({ message }) {
  const isCustomer =
    message?.sender === 'CUSTOMER'

  const text =
    typeof message?.message === 'string'
      ? message.message
      : ''

  if (!text) {
    return null
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