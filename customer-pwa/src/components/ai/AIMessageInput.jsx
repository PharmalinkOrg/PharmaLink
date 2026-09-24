import {
  useEffect,
  useState,
} from 'react'
import { SendHorizontal } from 'lucide-react'

const MAX_MESSAGE_LENGTH = 2000

function AIMessageInput({
  onSend,
  disabled = false,
  conversationClosed = false,
  initialMessage = '',
}) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (typeof initialMessage === 'string' && initialMessage.trim()) {
      setMessage(initialMessage)
    }
  }, [initialMessage])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()

    if (!trimmedMessage || disabled || conversationClosed) return

    setMessage('')

    try {
      await onSend(trimmedMessage)
    } catch {
      setMessage(trimmedMessage)
    }
  }

  if (conversationClosed) {
    return (
      <div className="ai-closed-input">
        <p>This conversation is closed. Start a new chat to continue.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="ai-message-form">
      <div className="mx-auto max-w-3xl">
        <div className="ai-message-composer">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            disabled={disabled}
            placeholder="Ask PharmaLink Assistant..."
            className="ai-message-textarea"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            aria-label="Send message"
            className="ai-send-button"
          >
            <SendHorizontal size={19} />
          </button>
        </div>

        <div className="ai-message-hint">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>{message.length}/{MAX_MESSAGE_LENGTH}</span>
        </div>
      </div>
    </form>
  )
}

export default AIMessageInput
