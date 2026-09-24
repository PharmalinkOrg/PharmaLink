import {
  MessageSquareText,
  Plus,
  X,
} from 'lucide-react'

function formatConversationDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

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
    <aside className="ai-conversation-sidebar">
      <div className="ai-new-chat-wrap">
        <button
          type="button"
          onClick={onNewConversation}
          disabled={disabled}
          className="ai-primary-button"
        >
          <Plus size={17} />
          New chat
        </button>
      </div>

      <div className="ai-conversation-scroll">
        <p className="ai-conversation-label">Conversations</p>

        {isLoading ? (
          <div className="space-y-2 p-1">
            {[1, 2, 3].map((item) => (
              <div key={item} className="ai-conversation-skeleton" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="ai-conversation-empty">
            No previous conversations yet.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const conversationId = conversation.conversation_id
              const isSelected =
                Number(activeConversationId) === Number(conversationId)
              const isClosed = conversation.status === 'CLOSED'

              return (
                <div
                  key={conversationId}
                  className={`ai-conversation-row ${
                    isSelected ? 'is-selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conversationId)}
                    disabled={disabled}
                    className="ai-conversation-select"
                  >
                    <MessageSquareText size={17} className="ai-conversation-icon" />

                    <div className="min-w-0 flex-1">
                      <p className="ai-conversation-title">
                        {conversation.title || 'New conversation'}
                      </p>

                      <div className="ai-conversation-meta">
                        <span>
                          {formatConversationDate(
                            conversation.last_message_at ||
                              conversation.started_at ||
                              conversation.created_at
                          )}
                        </span>

                        {isClosed && (
                          <span className="ai-closed-badge">Closed</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => onClose(conversationId)}
                      disabled={disabled}
                      aria-label="Close conversation"
                      title="Close conversation"
                      className="ai-close-conversation"
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
