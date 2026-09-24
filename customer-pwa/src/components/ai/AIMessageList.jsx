import { useEffect, useRef } from 'react'
import AIMessageBubble from './AIMessageBubble'

function AIMessageList({
  messages = [],
  isSending = false,
  onNavigate,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  return (
    <div className="ai-message-list">
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
          <div className="ai-typing-row">
            <div className="ai-message-avatar ai-assistant-avatar">AI</div>
            <div className="ai-typing-bubble">
              <div className="flex gap-1.5" aria-label="Assistant is responding">
                <span />
                <span className="[animation-delay:150ms]" />
                <span className="[animation-delay:300ms]" />
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
