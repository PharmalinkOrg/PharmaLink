import {
  Bot,
  ClipboardList,
  Search,
  FileText,
  PackageSearch,
} from 'lucide-react'

const suggestions = [
  { icon: Search, label: 'Find a medicine', prompt: 'Where can I find Paracetamol?' },
  { icon: ClipboardList, label: 'My reservations', prompt: 'Show my reservations.' },
  { icon: FileText, label: 'My prescriptions', prompt: 'Show my prescriptions.' },
  { icon: PackageSearch, label: 'Medicine requests', prompt: 'Show my medicine requests.' },
]

function AIEmptyState({ onSuggestion, disabled = false }) {
  return (
    <div className="ai-empty-state">
      <div className="w-full max-w-2xl text-center">
        <div className="ai-empty-bot">
          <Bot size={28} />
        </div>

        <h2>How can I help?</h2>

        <p className="ai-empty-description">
          Ask about PharmaLink, medicine availability, reservations,
          prescriptions, or medicine requests.
        </p>

        <div className="ai-suggestion-grid">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon

            return (
              <button
                key={suggestion.label}
                type="button"
                disabled={disabled}
                onClick={() => onSuggestion(suggestion.prompt)}
                className="ai-suggestion-card"
              >
                <div className="ai-suggestion-icon">
                  <Icon size={18} />
                </div>
                <span>{suggestion.label}</span>
              </button>
            )
          })}
        </div>

        <p className="ai-disclaimer">
          PharmaLink Assistant does not provide medical diagnosis,
          treatment, or personalized medicine recommendations.
        </p>
      </div>
    </div>
  )
}

export default AIEmptyState
