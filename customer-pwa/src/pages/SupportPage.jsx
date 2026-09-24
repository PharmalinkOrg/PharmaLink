import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  PackageSearch,
  Search,
  ShoppingBag,
} from 'lucide-react'

const FAQS = [
  {
    id: 'find-medicine',
    question: 'How do I find a medicine?',
    answer:
      'Use the medicine search in PharmaLink to look for medicines and view availability information from participating pharmacies.',
    keywords: ['medicine', 'search', 'availability', 'find'],
  },
  {
    id: 'reservation',
    question: 'How do I reserve a medicine?',
    answer:
      'Find the medicine you need, select an available pharmacy, and continue to the reservation process. Review the medicine, quantity, pickup date, and pickup time before submitting your reservation.',
    keywords: ['reservation', 'reserve', 'pickup', 'medicine'],
  },
  {
    id: 'reservation-status',
    question: 'Where can I check my reservation?',
    answer:
      'Open My Reservations to view your submitted reservations and their current status.',
    keywords: ['reservation', 'status', 'pickup'],
  },
  {
    id: 'cancel-reservation',
    question: 'Can I cancel a reservation?',
    answer:
      'Open the reservation from My Reservations. If the reservation is still eligible for cancellation, the cancellation option will be available from its details.',
    keywords: ['cancel', 'reservation'],
  },
  {
    id: 'prescription',
    question: 'How do I upload a prescription?',
    answer:
      'Open the prescription upload feature, choose the pharmacy, select your prescription file or image, and submit it for the pharmacy workflow.',
    keywords: ['prescription', 'upload', 'pharmacy'],
  },
  {
    id: 'medicine-request',
    question: 'What should I do if a medicine is unavailable?',
    answer:
      'You can submit a medicine request to a pharmacy through PharmaLink and check the request later for updates.',
    keywords: ['medicine', 'request', 'unavailable'],
  },
  {
    id: 'pickup',
    question: 'Does PharmaLink deliver medicines?',
    answer:
      'PharmaLink currently supports medicine reservations for pharmacy pickup. Delivery is not part of the current platform.',
    keywords: ['delivery', 'pickup'],
  },
  {
    id: 'ai',
    question: 'What can PharmaLink AI help me with?',
    answer:
      'PharmaLink AI can help you understand how to use the platform, navigate features, and get assistance with reservations, prescriptions, medicine requests, and general PharmaLink questions. It does not make medical decisions.',
    keywords: ['ai', 'assistant', 'help'],
  },
]

function SupportPage() {
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return FAQS
    }

    return FAQS.filter((faq) => {
      const searchableText = [
        faq.question,
        faq.answer,
        ...faq.keywords,
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [searchTerm])

  const toggleFaq = (id) => {
    setOpenFaq((current) => (current === id ? null : id))
  }

  const quickActions = [
    {
      label: 'Find Medicines',
      description: 'Search medicine availability',
      icon: Search,
      path: '/search',
    },
    {
      label: 'My Reservations',
      description: 'Check reservation status',
      icon: ShoppingBag,
      path: '/my-reservations',
    },
    {
      label: 'My Prescriptions',
      description: 'View prescription records',
      icon: FileText,
      path: '/my-prescriptions',
    },
    {
      label: 'Medicine Requests',
      description: 'Check requested medicines',
      icon: PackageSearch,
      path: '/my-requests',
    },
  ]

  return (
    <section className="min-h-screen bg-gray-50 pb-24 px-4 pt-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Help & Support
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Find answers and get help using PharmaLink.
            </p>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search help topics..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Quick Help
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Go directly to common PharmaLink features.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 text-left hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                    <Icon size={18} />
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    {action.label}
                  </p>

                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CircleHelp size={18} className="text-teal-700" />

            <h2 className="text-base font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id

                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={17}
                        className={`text-gray-400 flex-shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="p-6 text-center">
                <CircleHelp
                  size={26}
                  className="text-gray-300 mx-auto mb-2"
                />

                <p className="text-sm font-semibold text-gray-700">
                  No help topics found
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Try another search or ask PharmaLink AI.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="bg-[#0B2B2B] rounded-2xl p-5 text-white shadow-sm mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Bot size={20} />
            </div>

            <div className="flex-1">
              <h2 className="font-bold">
                Ask PharmaLink AI
              </h2>

              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Get help navigating PharmaLink, reservations,
                prescriptions, medicine requests, and other platform
                features.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/assistant')}
            className="mt-4 w-full py-3 bg-emerald-100 text-teal-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors"
          >
            Open AI Assistant
            <ChevronRight size={16} />
          </button>

          <p className="text-[11px] text-white/60 mt-3 text-center leading-relaxed">
            PharmaLink AI provides platform assistance and does not make
            medical decisions.
          </p>
        </div>

        {/* Additional help */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900">
            Still need help?
          </h2>

          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            If you need help with a specific reservation, prescription,
            medicine request, or pharmacy interaction, review the related
            record first so you have the relevant details available.
          </p>
        </div>

      </div>
    </section>
  )
}

export default SupportPage