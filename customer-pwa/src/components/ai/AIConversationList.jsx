import {
  MessageSquareText,
  Plus,
  X,
} from 'lucide-react'

function formatConversationDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function AIConversationList({
  conversations = [],
  activeConversationId = null,
  onSelect,
  onNewConversation,
  onClose,
  isLoading = false,
  disabled = false,
}) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-slate-50/70">
      {/* New conversation */}
      <div className="border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={onNewConversation}
          disabled={disabled}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          New chat
        </button>
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Conversations
        </p>

        {isLoading ? (
          <div className="space-y-2 p-1">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm leading-5 text-slate-500">
            No previous conversations yet.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const conversationId =
                conversation.conversation_id

              const isSelected =
                Number(activeConversationId) ===
                Number(conversationId)

              const isClosed =
                conversation.status === 'CLOSED'

              return (
                <div
                  key={conversationId}
                  className={`group flex items-center rounded-xl transition ${
                    isSelected
                      ? 'bg-teal-50'
                      : 'hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSelect(conversationId)
                    }
                    disabled={disabled}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left disabled:cursor-not-allowed"
                  >
                    <MessageSquareText
                      size={17}
                      className={
                        isSelected
                          ? 'shrink-0 text-teal-700'
                          : 'shrink-0 text-slate-400'
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isSelected
                            ? 'text-teal-800'
                            : 'text-slate-700'
                        }`}
                      >
                        {conversation.title ||
                          'New conversation'}
                      </p>

                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          {formatConversationDate(
                            conversation.last_message_at ||
                              conversation.started_at ||
                              conversation.created_at
                          )}
                        </span>

                        {isClosed && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-500">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() =>
                        onClose(conversationId)
                      }
                      disabled={disabled}
                      aria-label="Close conversation"
                      title="Close conversation"
                      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

export default AIConversationList