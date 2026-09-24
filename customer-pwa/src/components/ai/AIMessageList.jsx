import { useEffect, useRef } from 'react'
import AIMessageBubble from './AIMessageBubble'

function AIMessageList({
  messages = [],
  isSending = false,
  onNavigate,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, isSending])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {messages.map((message, index) => (
          <AIMessageBubble
            key={
              message.message_id ||
              message.id ||
              `${message.sender}-${index}`
            }
            message={message}
            onNavigate={onNavigate}
          />
        ))}

        {isSending && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
              AI
            </div>

            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div
                className="flex gap-1.5"
                aria-label="Assistant is responding"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />

                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />

                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default AIMessageList