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
  const [message, setMessage] =
    useState('')

  useEffect(() => {
    if (
      typeof initialMessage === 'string' &&
      initialMessage.trim()
    ) {
      setMessage(initialMessage)
    }
  }, [initialMessage])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (
      !trimmedMessage ||
      disabled ||
      conversationClosed
    ) {
      return
    }

    /*
     * Clear the textarea immediately while the
     * message is being sent.
     */
    setMessage('')

    try {
      await onSend(trimmedMessage)
    } catch {
      /*
       * Restore the customer's text if sending fails
       * so they do not need to type it again.
       */
      setMessage(trimmedMessage)
    }
  }

  if (conversationClosed) {
    return (
      <div className="border-t border-slate-200 bg-white px-4 py-4 text-center sm:px-5">
        <p className="text-sm text-slate-500">
          This conversation is closed. Start a new
          chat to continue.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
          <textarea
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            disabled={disabled}
            placeholder="Ask PharmaLink Assistant..."
            className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault()

                event.currentTarget.form?.requestSubmit()
              }
            }}
          />

          <button
            type="submit"
            disabled={
              disabled ||
              !message.trim()
            }
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <SendHorizontal size={19} />
          </button>
        </div>

        <div className="mt-1.5 flex justify-between px-1 text-[11px] text-slate-400">
          <span>
            Enter to send · Shift + Enter for a new line
          </span>

          <span>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>
    </form>
  )
}

export default AIMessageInput