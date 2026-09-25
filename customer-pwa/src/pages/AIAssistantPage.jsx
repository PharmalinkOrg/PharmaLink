import {
  useEffect,
  useState,
} from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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
import { queryKeys } from '../lib/queryKeys'

import {
  closeConversation,
  getConversation,
  getConversations,
  sendMessage,
} from '../services/aiService'

const aiQueryKeys = {
  conversations: [
    'ai-conversations',
  ],

  conversation: (conversationId) => [
    'ai-conversation',
    Number(conversationId),
  ],
}

function AIAssistantPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const suggestedMessage =
    typeof location.state?.suggestedMessage ===
    'string'
      ? location.state.suggestedMessage
      : ''

  const [
    conversationId,
    setConversationId,
  ] = useState(null)

  const [
    messages,
    setMessages,
  ] = useState([])

  const [
    error,
    setError,
  ] = useState('')

  const [
    conversationStatus,
    setConversationStatus,
  ] = useState('ACTIVE')

  const [
    isHistoryOpen,
    setIsHistoryOpen,
  ] = useState(false)

  // ==========================================================
  // CONVERSATION HISTORY QUERY
  // ==========================================================

  const {
    data: conversations = [],
    isLoading:
      isLoadingConversations,
    isError:
      isConversationsError,
    error:
      conversationsError,
  } = useQuery({
    queryKey:
      queryKeys.aiConversations,

    queryFn: async () => {
      const data =
        await getConversations()

      return Array.isArray(data)
        ? data
        : []
    },

    staleTime:
      60 * 1000,
  })

  // ==========================================================
  // ACTIVE CONVERSATION QUERY
  // ==========================================================

  const {
    data: activeConversation,
    isFetching:
      isLoadingConversation,
    isError:
      isConversationError,
    error:
      conversationError,
  } = useQuery({
    queryKey:
      aiQueryKeys.conversation(
        conversationId,
      ),

    queryFn: async () => {
      const conversation =
        await getConversation(
          conversationId,
        )

      if (!conversation) {
        throw new Error(
          'Conversation could not be found.',
        )
      }

      return conversation
    },

    enabled:
      Boolean(conversationId),

    staleTime:
      60 * 1000,
  })

  // ==========================================================
  // SEND MESSAGE MUTATION
  // ==========================================================

  const sendMessageMutation =
    useMutation({
      mutationFn: async ({
        message,
        activeConversationId,
      }) => {
        return sendMessage(
          message,
          activeConversationId,
        )
      },
    })

  // ==========================================================
  // CLOSE CONVERSATION MUTATION
  // ==========================================================

  const closeConversationMutation =
    useMutation({
      mutationFn:
        async (
          selectedConversationId,
        ) => {
          return closeConversation(
            selectedConversationId,
          )
        },
    })

  const isSending =
    sendMessageMutation.isPending

  const isClosingConversation =
    closeConversationMutation.isPending

  // ==========================================================
  // SUGGESTED MESSAGE
  // ==========================================================

  useEffect(() => {
    if (!suggestedMessage) {
      return
    }

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      },
    )
  }, [
    suggestedMessage,
    navigate,
    location.pathname,
  ])

  // ==========================================================
  // SYNCHRONIZE ACTIVE CONVERSATION WITH LOCAL CHAT UI
  // ==========================================================

  useEffect(() => {
    if (!activeConversation) {
      return
    }

    setConversationStatus(
      activeConversation.status ||
        'ACTIVE',
    )

    setMessages(
      Array.isArray(
        activeConversation.messages,
      )
        ? activeConversation.messages
        : [],
    )
  }, [activeConversation])

  // ==========================================================
  // QUERY ERRORS
  // ==========================================================

  useEffect(() => {
    if (!isConversationsError) {
      return
    }

    console.error(
      'Load AI conversations error:',
      conversationsError,
    )

    setError(
      conversationsError?.message ||
        'Conversation history could not be loaded.',
    )
  }, [
    isConversationsError,
    conversationsError,
  ])

  useEffect(() => {
    if (!isConversationError) {
      return
    }

    console.error(
      'Load AI conversation error:',
      conversationError,
    )

    setError(
      conversationError?.message ||
        'Conversation could not be loaded.',
    )
  }, [
    isConversationError,
    conversationError,
  ])

  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  const handleSelectConversation = (
    selectedConversationId,
  ) => {
    if (
      !selectedConversationId ||
      isSending ||
      isLoadingConversation ||
      isClosingConversation
    ) {
      return
    }

    setError('')

    setConversationId(
      selectedConversationId,
    )

    setIsHistoryOpen(false)
  }

  // ==========================================================
  // CLOSE CONVERSATION
  // ==========================================================

  const handleCloseConversation =
    async (
      selectedConversationId,
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

        const closedConversation =
          await closeConversationMutation
            .mutateAsync(
              selectedConversationId,
            )

        if (
          Number(conversationId) ===
          Number(
            selectedConversationId,
          )
        ) {
          const nextStatus =
            closedConversation?.status ||
            'CLOSED'

          setConversationStatus(
            nextStatus,
          )

          queryClient.setQueryData(
            aiQueryKeys.conversation(
              selectedConversationId,
            ),
            (current) => {
              if (!current) {
                return current
              }

              return {
                ...current,
                status:
                  nextStatus,
              }
            },
          )
        }

        queryClient.setQueryData(
          aiQueryKeys.conversations,
          (current = []) => {
            if (!Array.isArray(current)) {
              return current
            }

            return current.map(
              (conversation) => {
                if (
                  Number(
                    conversation
                      ?.conversation_id,
                  ) !==
                  Number(
                    selectedConversationId,
                  )
                ) {
                  return conversation
                }

                return {
                  ...conversation,

                  status:
                    closedConversation
                      ?.status ||
                    'CLOSED',
                }
              },
            )
          },
        )

        await queryClient
          .invalidateQueries({
            queryKey:
              aiQueryKeys
                .conversations,
          })
      } catch (requestError) {
        console.error(
          'Close AI conversation error:',
          requestError,
        )

        setError(
          requestError.message ||
            'Conversation could not be closed.',
        )
      }
    }

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSendMessage =
    async (message) => {
      const trimmedMessage =
        message.trim()

      if (
        !trimmedMessage ||
        isSending
      ) {
        return
      }

      setError('')

      const temporaryCustomerMessage = {
        id:
          `customer-${Date.now()}`,

        sender:
          'CUSTOMER',

        message:
          trimmedMessage,
      }

      setMessages(
        (current) => [
          ...current,
          temporaryCustomerMessage,
        ],
      )

      try {
        const currentConversationId =
          conversationId

        const result =
          await sendMessageMutation
            .mutateAsync({
              message:
                trimmedMessage,

              activeConversationId:
                currentConversationId,
            })

        if (!result?.reply) {
          throw new Error(
            'The assistant returned an empty response',
          )
        }

        const resolvedConversationId =
          currentConversationId ||
          result.conversationId ||
          null

        if (
          !currentConversationId &&
          resolvedConversationId
        ) {
          setConversationId(
            resolvedConversationId,
          )

          setConversationStatus(
            'ACTIVE',
          )
        }

        const assistantMessage = {
          id:
            `assistant-${Date.now()}`,

          sender:
            'ASSISTANT',

          message:
            result.reply,

          action:
            result.action ??
            null,
        }

        setMessages(
          (current) => [
            ...current,
            assistantMessage,
          ],
        )

        if (
          resolvedConversationId
        ) {
          queryClient.setQueryData(
            aiQueryKeys.conversation(
              resolvedConversationId,
            ),
            (current) => {
              const persistedMessages =
                Array.isArray(
                  current?.messages,
                )
                  ? current.messages
                  : []

              const customerMessage = {
                sender:
                  'CUSTOMER',

                message:
                  trimmedMessage,
              }

              const responseMessage = {
                sender:
                  'ASSISTANT',

                message:
                  result.reply,

                action:
                  result.action ??
                  null,
              }

              if (!current) {
                return {
                  conversation_id:
                    resolvedConversationId,

                  status:
                    'ACTIVE',

                  messages: [
                    customerMessage,
                    responseMessage,
                  ],
                }
              }

              return {
                ...current,

                messages: [
                  ...persistedMessages,
                  customerMessage,
                  responseMessage,
                ],
              }
            },
          )
        }

        await queryClient
          .invalidateQueries({
            queryKey:
              aiQueryKeys
                .conversations,
          })

        /*
         * Refresh the authoritative conversation
         * after the backend has persisted the new
         * customer and assistant messages.
         */
        if (
          resolvedConversationId
        ) {
          await queryClient
            .invalidateQueries({
              queryKey:
                aiQueryKeys
                  .conversation(
                    resolvedConversationId,
                  ),
            })
        }

        return result
      } catch (requestError) {
        console.error(
          'AI Assistant message error:',
          requestError,
        )

        setMessages(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                temporaryCustomerMessage.id,
            ),
        )

        setError(
          requestError.message ||
            'The assistant could not respond. Please try again.',
        )

        throw requestError
      }
    }

  // ==========================================================
  // NEW CONVERSATION
  // ==========================================================

  const handleNewConversation = () => {
    if (
      isSending ||
      isLoadingConversation ||
      isClosingConversation
    ) {
      return
    }

    setConversationId(null)

    setConversationStatus(
      'ACTIVE',
    )

    setMessages([])

    setError('')

    setIsHistoryOpen(false)
  }

  // ==========================================================
  // SUGGESTED PROMPT
  // ==========================================================

  const handleSuggestion =
    async (prompt) => {
      try {
        await handleSendMessage(
          prompt,
        )
      } catch {
        // Visible error is handled by handleSendMessage.
      }
    }

  // ==========================================================
  // CONTROLLED AI NAVIGATION
  // ==========================================================

  const handleAINavigation = (
    route,
  ) => {
    if (
      typeof route !==
        'string' ||
      !route
    ) {
      return
    }

    navigate(route)
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="ai-assistant-page mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="ai-assistant-shell overflow-hidden rounded-2xl">
        <div className="grid min-h-[calc(100vh-13rem)] grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">

          {/* Desktop conversation history */}

          <div className="hidden md:block">
            <AIConversationList
              conversations={
                conversations
              }
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

          {/* Chat */}

          <div className="flex min-h-0 flex-col">
            <AIChatHeader
              onNewConversation={
                handleNewConversation
              }
              onOpenHistory={() =>
                setIsHistoryOpen(
                  true,
                )
              }
              disabled={
                isSending ||
                isLoadingConversation ||
                isClosingConversation
              }
            />

            {/* Error */}

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
                  onClick={() =>
                    setError('')
                  }
                  aria-label="Dismiss error"
                  className="shrink-0 rounded-md p-1 transition hover:bg-red-100"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Conversation */}

            {isLoadingConversation ? (
              <div className="ai-loading-state flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <div className="ai-loading-spinner mx-auto h-8 w-8 animate-spin rounded-full border-2" />

                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Loading conversation...
                  </p>
                </div>
              </div>
            ) : messages.length ===
              0 ? (
              <AIEmptyState
                onSuggestion={
                  handleSuggestion
                }
                disabled={
                  isSending
                }
              />
            ) : (
              <AIMessageList
                messages={
                  messages
                }
                isSending={
                  isSending
                }
                onNavigate={
                  handleAINavigation
                }
              />
            )}

            <AIMessageInput
              onSend={
                handleSendMessage
              }
              disabled={
                isSending ||
                isLoadingConversation ||
                isClosingConversation
              }
              conversationClosed={
                conversationStatus ===
                'CLOSED'
              }
              initialMessage={
                suggestedMessage
              }
            />
          </div>
        </div>
      </div>

      {/* Mobile conversation history */}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() =>
              setIsHistoryOpen(
                false,
              )
            }
            className="ai-history-overlay absolute inset-0"
          />

          <div className="ai-history-drawer absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col shadow-xl">
            <div className="ai-history-drawer-header flex h-16 items-center justify-between border-b px-4">
              <div>
                <h2 className="font-bold text-[var(--text-primary)]">
                  Conversations
                </h2>

                <p className="text-xs text-[var(--text-secondary)]">
                  Your PharmaLink Assistant history
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsHistoryOpen(
                    false,
                  )
                }
                aria-label="Close history"
                className="ai-icon-button flex h-9 w-9 items-center justify-center rounded-lg transition"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <AIConversationList
                conversations={
                  conversations
                }
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