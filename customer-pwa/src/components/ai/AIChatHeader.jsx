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
    <header className="flex min-h-[80px] items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
      <button
        type="button"
        onClick={onOpenHistory}
        disabled={disabled}
        aria-label="Open conversation history"
        title="Conversation history"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
      >
        <History size={19} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Bot size={23} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
            PharmaLink Assistant
          </h1>

          <p className="truncate text-xs text-slate-500 sm:text-sm">
            Platform and account support
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewConversation}
        disabled={disabled}
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
      >
        <Plus size={17} />

        <span className="hidden sm:inline">
          New chat
        </span>
      </button>
    </header>
  )
}

export default AIChatHeader