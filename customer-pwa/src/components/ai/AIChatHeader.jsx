import {
  Bot,
  History,
  Plus,
} from 'lucide-react'

function AIChatHeader({
  onNewConversation,
  onOpenHistory,
  disabled = false,
}) {
  return (
    <header className="ai-chat-header">
      <button
        type="button"
        onClick={onOpenHistory}
        disabled={disabled}
        aria-label="Open conversation history"
        title="Conversation history"
        className="ai-icon-button ai-mobile-only"
      >
        <History size={19} />
      </button>

      <div className="ai-chat-title">
        <div className="ai-brand-icon">
          <Bot size={23} />
        </div>

        <div className="min-w-0">
          <h1>PharmaLink Assistant</h1>
          <p>Platform and account support</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewConversation}
        disabled={disabled}
        className="ai-header-new-chat ai-mobile-only"
      >
        <Plus size={17} />
        <span>New chat</span>
      </button>
    </header>
  )
}

export default AIChatHeader
