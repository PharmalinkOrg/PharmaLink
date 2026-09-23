import {
  Bot,
  ClipboardList,
  Search,
  FileText,
  PackageSearch,
} from 'lucide-react'

const suggestions = [
  {
    icon: Search,
    label: 'Find a medicine',
    prompt: 'Where can I find Paracetamol?',
  },
  {
    icon: ClipboardList,
    label: 'My reservations',
    prompt: 'Show my reservations.',
  },
  {
    icon: FileText,
    label: 'My prescriptions',
    prompt: 'Show my prescriptions.',
  },
  {
    icon: PackageSearch,
    label: 'Medicine requests',
    prompt: 'Show my medicine requests.',
  },
]

function AIEmptyState({
  onSuggestion,
  disabled = false,
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Bot size={28} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">
          How can I help?
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Ask about PharmaLink, medicine availability,
          reservations, prescriptions, or medicine requests.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon

            return (
              <button
                key={suggestion.label}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSuggestion(suggestion.prompt)
                }
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon size={18} />
                </div>

                <span className="text-sm font-semibold text-slate-700">
                  {suggestion.label}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          PharmaLink Assistant does not provide medical
          diagnosis, treatment, or personalized medicine
          recommendations.
        </p>
      </div>
    </div>
  )
}

export default AIEmptyState