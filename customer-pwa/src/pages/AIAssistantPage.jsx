import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { AlertCircle, X } from 'lucide-react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import AIChatHeader from '../components/ai/AIChatHeader'
import AIConversationList from '../components/ai/AIConversationList'
import AIMessageList from '../components/ai/AIMessageList'
import AIMessageInput from '../components/ai/AIMessageInput'
import AIEmptyState from '../components/ai/AIEmptyState'

import {
  closeConversation,
  getConversation,
  getConversations,
  sendMessage,
} from '../services/aiService'

function AIAssistantPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const suggestedMessage =
    typeof location.state?.suggestedMessage ===
    'string'
      ? location.state.suggestedMessage
      : ''

  const [conversationId, setConversationId] =
    useState(null)

  const [messages, setMessages] = useState([])

  const [isSending, setIsSending] =
    useState(false)

  const [error, setError] =
    useState('')

  const [conversations, setConversations] =
    useState([])

  const [
    isLoadingConversations,
    setIsLoadingConversations,
  ] = useState(true)

  const [
    isLoadingConversation,
    setIsLoadingConversation,
  ] = useState(false)

  const [
    conversationStatus,
    setConversationStatus,
  ] = useState('ACTIVE')

  const [
    isClosingConversation,
    setIsClosingConversation,
  ] = useState(false)

  const [
    isHistoryOpen,
    setIsHistoryOpen,
  ] = useState(false)

  useEffect(() => {
    if (!suggestedMessage) {
      return
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [
    suggestedMessage,
    navigate,
    location.pathname,
  ])

  const loadConversations =
    useCallback(async () => {
      try {
        setIsLoadingConversations(true)

        const data = await getConversations()

        setConversations(
          Array.isArray(data) ? data : []
        )
      } catch (requestError) {
        console.error(
          'Load AI conversations error:',
          requestError
        )

        setError(
          requestError.message ||
            'Conversation history could not be loaded.'
        )
      } finally {
        setIsLoadingConversations(false)
      }
    }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleSelectConversation = async (
    selectedConversationId
  ) => {
    if (
      !selectedConversationId ||
      isSending ||
      isLoadingConversation
    ) {
      return
    }

    try {
      setError('')
      setIsLoadingConversation(true)

      const conversation =
        await getConversation(
          selectedConversationId
        )

      if (!conversation) {
        throw new Error(
          'Conversation could not be found.'
        )
      }

      setConversationId(
        conversation.conversation_id
      )

      setConversationStatus(
        conversation.status || 'ACTIVE'
      )

      setMessages(
        Array.isArray(conversation.messages)
          ? conversation.messages
          : []
      )

      setIsHistoryOpen(false)
    } catch (requestError) {
      console.error(
        'Load AI conversation error:',
        requestError
      )

      setError(
        requestError.message ||
          'Conversation could not be loaded.'
      )
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const handleCloseConversation = async (
    selectedConversationId
  ) => {
    if (
      !selectedConversationId ||
      isSending ||
      isLoadingConversation ||
      isClosingConversation
    ) {
      return
    }

    try {
      setError('')
      setIsClosingConversation(true)

      const closedConversation =
        await closeConversation(
          selectedConversationId
        )

      /*
       * If the customer closed the conversation that is
       * currently displayed, immediately mark the chat as
       * closed so the input becomes unavailable.
       */
      if (
        Number(conversationId) ===
        Number(selectedConversationId)
      ) {
        setConversationStatus(
          closedConversation?.status ||
            'CLOSED'
        )
      }

      /*
       * Refresh the sidebar so the conversation now displays
       * its CLOSED status.
       */
      await loadConversations()
    } catch (requestError) {
      console.error(
        'Close AI conversation error:',
        requestError
      )

      setError(
        requestError.message ||
          'Conversation could not be closed.'
      )
    } finally {
      setIsClosingConversation(false)
    }
  }

  /* ============================================================
     SEND MESSAGE
  ============================================================ */

  const handleSendMessage = async (message) => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage || isSending) {
      return
    }

    setError('')
    setIsSending(true)

    /*
     * Optimistically show the customer's message immediately.
     *
     * This object is frontend-only. The backend remains the
     * source of truth for persisted conversation messages.
     */
    const temporaryCustomerMessage = {
      id: `customer-${Date.now()}`,
      sender: 'CUSTOMER',
      message: trimmedMessage,
    }

    setMessages((current) => [
      ...current,
      temporaryCustomerMessage,
    ])

    try {
      const result = await sendMessage(
        trimmedMessage,
        conversationId
      )

      if (!result?.reply) {
        throw new Error(
          'The assistant returned an empty response'
        )
      }

      /*
       * The backend creates the conversation when the first
       * message is sent and returns its ID.
       */
      if (
        !conversationId &&
        result.conversationId
      ) {
        setConversationId(
          result.conversationId
        )
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'ASSISTANT',
        message: result.reply,

        /*
         * Ephemeral UI action returned by the backend.
         *
         * AIMessageBubble will independently validate this against
         * the frontend navigation allowlist before displaying it.
         */
        action: result.action ?? null,
      }

      setMessages((current) => [
        ...current,
        assistantMessage,
      ])

      /*
       * Refresh conversation history after a successful
       * exchange so newly created conversations and their
       * latest activity appear immediately in the sidebar.
       */
      await loadConversations()

      return result
    } catch (requestError) {
      console.error(
        'AI Assistant message error:',
        requestError
      )

      /*
       * Remove the optimistic customer message because the
       * backend did not successfully complete the request.
       *
       * AIMessageInput will restore the text into the textarea
       * because this function rethrows the error.
       */
      setMessages((current) =>
        current.filter(
          (item) =>
            item.id !==
            temporaryCustomerMessage.id
        )
      )

      setError(
        requestError.message ||
          'The assistant could not respond. Please try again.'
      )

      throw requestError
    } finally {
      setIsSending(false)
    }
  }

  /* ============================================================
     NEW CONVERSATION
  ============================================================ */

  const handleNewConversation = () => {
    if (
      isSending ||
      isLoadingConversation ||
      isClosingConversation
    ) {
      return
    }

    setConversationId(null)
    setConversationStatus('ACTIVE')
    setMessages([])
    setError('')
    setIsHistoryOpen(false)
  }

  /* ============================================================
     SUGGESTED PROMPT
  ============================================================ */

  const handleSuggestion = async (prompt) => {
    try {
      await handleSendMessage(prompt)
    } catch {
      /*
       * handleSendMessage already handles the visible error.
       * No additional UI action is required here.
       */
    }
  }

  /* ============================================================
     CONTROLLED AI NAVIGATION
  ============================================================ */

  const handleAINavigation = (route) => {
    if (typeof route !== 'string' || !route) {
      return
    }

    /*
     * The route reaching this function has already been resolved
     * from the frontend-owned AI navigation allowlist.
     */
    navigate(route)
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <section className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-h-[calc(100vh-13rem)] grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden md:block">
            <AIConversationList
              conversations={conversations}
              activeConversationId={
                conversationId
              }
              onSelect={
                handleSelectConversation
              }
              onNewConversation={
                handleNewConversation
              }
              onClose={
                handleCloseConversation
              }
              isLoading={
                isLoadingConversations
              }
              disabled={
                isSending ||
                isLoadingConversation ||
                isClosingConversation
              }
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <AIChatHeader
              onNewConversation={
                handleNewConversation
              }
              onOpenHistory={() =>
                setIsHistoryOpen(true)
              }
              disabled={
                isSending ||
                isLoadingConversation ||
                isClosingConversation
              }
            />

            {error && (
              <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <p className="flex-1">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => setError('')}
                  aria-label="Dismiss error"
                  className="shrink-0 rounded-md p-1 transition hover:bg-red-100"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {isLoadingConversation ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />

                  <p className="mt-3 text-sm text-slate-500">
                    Loading conversation...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <AIEmptyState
                onSuggestion={
                  handleSuggestion
                }
                disabled={isSending}
              />
            ) : (
              <AIMessageList
                messages={messages}
                isSending={isSending}
                onNavigate={handleAINavigation}
              />
            )}

            <AIMessageInput
              onSend={handleSendMessage}
              disabled={
                isSending ||
                isLoadingConversation ||
                isClosingConversation
              }
              conversationClosed={
                conversationStatus === 'CLOSED'
              }
              initialMessage={suggestedMessage}
            />
          </div>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() =>
              setIsHistoryOpen(false)
            }
            className="absolute inset-0 bg-slate-900/40"
          />

          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Conversations
                </h2>

                <p className="text-xs text-slate-500">
                  Your PharmaLink Assistant history
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsHistoryOpen(false)
                }
                aria-label="Close history"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <AIConversationList
                conversations={conversations}
                activeConversationId={
                  conversationId
                }
                onSelect={
                  handleSelectConversation
                }
                onNewConversation={
                  handleNewConversation
                }
                onClose={
                  handleCloseConversation
                }
                isLoading={
                  isLoadingConversations
                }
                disabled={
                  isSending ||
                  isLoadingConversation ||
                  isClosingConversation
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AIAssistantPage