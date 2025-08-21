"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Loader2, RefreshCw, Plus } from "lucide-react"
import { apiCall } from "@/lib/api"
import { useAuth } from "@/contexts/simple-auth-context"
import { useMessageStreaming } from "@/hooks/use-message-streaming"
import { HandoffRequestButton } from "@/components/human-in-loop/handoff-request-button"
import { ConversationModeIndicator } from "@/components/human-in-loop/conversation-mode-indicator"
import type { ConversationMode } from "@/types/human-in-loop"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

interface AIAgent {
  id: string
  name: string
  tone: "Professional" | "Friendly" | "Neutral"
  language: "English" | "Tagalog"
  status: "creating" | "ready" | "error"
  openingMessage?: string
}

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

interface ChatPreviewModalProps {
  agent: AIAgent
  open: boolean
  onClose: () => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  conversationId: string | null
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>
}

export function ChatPreviewModal({
  agent,
  open,
  onClose,
  messages,
  setMessages,
  conversationId,
  setConversationId,
}: ChatPreviewModalProps) {
  const { getAuthHeaders } = useAuth()
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({})
  const [loadingInitialMessages, setLoadingInitialMessages] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [isActiveConversation, setIsActiveConversation] = useState(false)
  const [sseConnectionStatus, setSseConnectionStatus] = useState(false)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [apiHealthy, setApiHealthy] = useState(true)
  const [conversationMode, setConversationMode] = useState<ConversationMode>('ai')
  const [humanAgentName, setHumanAgentName] = useState<string | undefined>(undefined)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const modalOpeningRef = useRef(false) // Prevent double execution in StrictMode

  // Helper function for API calls with timeout and better error handling
  const makeApiCallWithTimeout = async (endpoint: string, headers: Record<string, string>, timeoutMs = 10000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await apiCall(endpoint, {
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timed out - please check your connection')
      }
      throw error
    }
  }

  // Check API health
  const checkApiHealth = async () => {
    try {
      console.log('[Chat Preview] Checking API health...')
      const headers = await getAuthHeaders()
      if (!('Authorization' in headers)) {
        throw new Error('No authentication token available')
      }
      
      console.log('[Chat Preview] API health check passed - auth headers available')
      setApiHealthy(true)
      return true
    } catch (error) {
      console.error('[Chat Preview] API health check failed:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
        timestamp: new Date().toISOString()
      })
      setApiHealthy(false)
      setErrorState('Unable to connect to the server. Please check your internet connection.')
      return false
    }
  }

  // Get auth headers
  useEffect(() => {
    const fetchAuthHeaders = async () => {
      const headers = await getAuthHeaders()
      setAuthHeaders(headers)
    }
    fetchAuthHeaders()
  }, [getAuthHeaders])

  // Reset local state when the modal is closed
  useEffect(() => {
    if (!open) {
      setNewMessage("")
      setSending(false)
      setHistoryLoaded(false)
      setIsActiveConversation(false)
      setSseConnectionStatus(false)
      setErrorState(null)
      setApiHealthy(true)
      setConversationMode('ai')
      setHumanAgentName(undefined)
      setHandoffRequested(false)
      modalOpeningRef.current = false // Reset double execution prevention
    }
  }, [open])

  // Handle new messages from streaming
  const handleNewMessage = useCallback((newMessage: Message) => {
    console.log("[Chat Preview] Received new message from stream:", newMessage)
    
    // User messages should never come from streaming (they're added immediately when sent)
    if (newMessage.sender === "user") {
      console.log("[Chat Preview] Ignoring user message from streaming.")
      return
    }

    setMessages(prev => {
      // Enhanced duplicate detection
      const messageExists = prev.some(msg => {
        // Primary check: exact ID match (but skip immediate vs SSE comparison)
        if (msg.id && newMessage.id && msg.id === newMessage.id) {
          console.log("[Chat Preview] Duplicate detected by ID:", newMessage.id)
          return true
        }
        
        // Skip duplicate check between immediate responses and SSE messages with same content
        // (immediate responses have "immediate-ai-" prefix, SSE messages have backend IDs)
        const isImmediateMessage = msg.id?.startsWith('immediate-ai-')
        const isSSEMessage = !newMessage.id?.startsWith('immediate-ai-') && !newMessage.id?.startsWith('user-')
        
        if (isImmediateMessage && isSSEMessage && msg.content === newMessage.content && msg.sender === newMessage.sender) {
          console.log("[Chat Preview] Skipping duplicate between immediate API response and SSE message:", {
            immediate: msg.content.substring(0, 50),
            sse: newMessage.content.substring(0, 50)
          })
          return true
        }
        
        // Secondary check: same content and sender within 5 seconds (for other cases)
        if (msg.content === newMessage.content && msg.sender === newMessage.sender) {
          const msgTime = new Date(msg.timestamp).getTime()
          const newMsgTime = new Date(newMessage.timestamp).getTime()
          const timeDiff = Math.abs(newMsgTime - msgTime)
          
          if (timeDiff < 5000) { // 5 seconds
            console.log("[Chat Preview] Duplicate detected by content and timing:", {
              content: newMessage.content.substring(0, 50),
              timeDiff: timeDiff + "ms"
            })
            return true
          }
        }
        
        return false
      })
      
      if (messageExists) {
        console.log("[Chat Preview] Skipping duplicate message")
        return prev
      }
      
      console.log("[Chat Preview] Adding new message from SSE:", {
        id: newMessage.id,
        content: newMessage.content.substring(0, 50) + "...",
        sender: newMessage.sender
      })
      return [...prev, newMessage]
    })
  }, [setMessages])

  // Initialize message streaming
  const { isConnected: sseConnected } = useMessageStreaming({
    conversationId,
    onNewMessage: handleNewMessage,
    authHeaders
  })

  // Force re-render when SSE connection status changes
  useEffect(() => {
    setSseConnectionStatus(sseConnected)
  }, [sseConnected])

  // Update SSE connection status and log changes
  useEffect(() => {
    const statusChanged = sseConnectionStatus !== sseConnected
    setSseConnectionStatus(sseConnected)
    
    if (conversationId && statusChanged) {
      console.log("[Chat Preview] SSE connection status changed for", conversationId, ":", sseConnected ? "Connected" : "Connecting...")
    }
  }, [sseConnected, conversationId, sseConnectionStatus])

  // Fetch initial messages when opening modal with existing conversationId
  const fetchInitialMessages = useCallback(async (convId: string, forceReload = false, retryCount = 0) => {
    if (!convId) {
      console.log("[Chat Preview] No conversationId provided to fetchInitialMessages")
      setErrorState("No conversation ID provided")
      setLoadingInitialMessages(false)
      return
    }
    
    // Allow forcing reload even if history was previously loaded
    if (historyLoaded && !forceReload) {
      console.log("[Chat Preview] History already loaded for", convId, "- skipping (use forceReload=true to override)")
      return
    }
    
    const maxRetries = 2
    const retryDelay = 1000 * (retryCount + 1) // Exponential backoff: 1s, 2s, 3s
    
    console.log("[Chat Preview] Loading initial messages for conversation:", convId, forceReload ? "(forced reload)" : "", retryCount > 0 ? `(retry ${retryCount}/${maxRetries})` : "")
    setLoadingInitialMessages(true)
    setErrorState(null)
    
    try {
      // Check API health first
      const isHealthy = await checkApiHealth()
      if (!isHealthy) {
        return
      }
      
      const headers = await getAuthHeaders()
      if (!('Authorization' in headers)) {
        throw new Error('Authentication required - please log in again')
      }
      
      const response = await makeApiCallWithTimeout(`/api/conversations/${convId}/messages`, headers)

      const messagesData = response?.messages && Array.isArray(response.messages) ? response.messages : Array.isArray(response) ? response : []

      const transformedMessages = messagesData.map((message: any) => ({
        id: message.id || `msg-${Date.now()}-${Math.random()}`,
        content: message.content || "",
        sender: message.sender || "user",
        timestamp: message.timestamp || message.sent_at || new Date().toISOString(),
      }))
      
      console.log("[Chat Preview] Successfully loaded", transformedMessages.length, "historical messages for", convId)
      setMessages(transformedMessages)
      setHistoryLoaded(true)
      setErrorState(null)
    } catch (error) {
      console.error("[Chat Preview] Failed to fetch initial messages for preview:", {
        conversationId: convId,
        agentId: agent.id,
        retryCount,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
        } : error,
        apiHealthy,
        timestamp: new Date().toISOString()
      })
      
      let errorMessage = "Failed to load chat history"
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Request timed out - please try again"
        } else if (error.message.includes('Authentication')) {
          errorMessage = error.message
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error - check your connection"
        } else if (error.message.includes('404')) {
          errorMessage = "Conversation not found - it may have been deleted"
        } else if (error.message.includes('500')) {
          errorMessage = "Server error - please try again later"
        }
      }
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && (
        error instanceof Error && (
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('500') ||
          error.message.includes('502') ||
          error.message.includes('503')
        )
      )) {
        console.log(`[Chat Preview] Retrying history fetch in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        setErrorState(`${errorMessage} - retrying in ${retryDelay / 1000}s...`)
        setTimeout(() => {
          fetchInitialMessages(convId, forceReload, retryCount + 1)
        }, retryDelay)
        return // Don't set loading to false or show fallback yet
      }
      
      // If all retries failed, set error state and fallback
      setErrorState(errorMessage)
      
      // Show fallback content
      if (agent.openingMessage) {
        console.log("[Chat Preview] Falling back to opening message due to history fetch error")
        setMessages([
          {
            id: "initial-ai-message",
            content: agent.openingMessage,
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      } else {
        setMessages([])
      }
      setHistoryLoaded(true)
    } finally {
      setLoadingInitialMessages(false)
    }
  }, [getAuthHeaders, historyLoaded, agent.openingMessage, setMessages, checkApiHealth, makeApiCallWithTimeout])

  // Fetch conversation history when we get a new conversationId from API
  const fetchConversationHistory = useCallback(async (convId: string) => {
    if (!convId) return
    
    console.log("[Chat Preview] Fetching conversation history for conversationId:", convId)
    
    try {
      const headers = await getAuthHeaders()
      if (!('Authorization' in headers)) {
        console.warn("[Chat Preview] No auth headers available for conversation history")
        return
      }
      
      const historyResponse = await makeApiCallWithTimeout(`/api/conversations/${convId}/messages`, headers)

      const messagesData = historyResponse?.messages && Array.isArray(historyResponse.messages) ? historyResponse.messages : Array.isArray(historyResponse) ? historyResponse : []

      const transformedMessages = messagesData.map((message: any) => ({
        id: message.id || `msg-${Date.now()}-${Math.random()}`,
        content: message.content || "",
        sender: message.sender || "user",
        timestamp: message.timestamp || message.sent_at || new Date().toISOString(),
      }))
      
      console.log("[Chat Preview] Loaded", transformedMessages.length, "messages from conversation history")
      
      // Replace current messages with the full conversation history
      setMessages(transformedMessages)
      setHistoryLoaded(true)
      setErrorState(null)
    } catch (error) {
      console.error("Failed to fetch conversation history after setting conversationId:", error)
      setErrorState("Failed to load conversation history")
    }
  }, [getAuthHeaders, setMessages, makeApiCallWithTimeout])

  // Handle modal opening and conversation history loading
  useEffect(() => {
    if (!open) {
      modalOpeningRef.current = false
      return
    }

    // Prevent double execution in React StrictMode
    if (modalOpeningRef.current) {
      return
    }
    modalOpeningRef.current = true

    console.log("[Chat Preview] Modal opened for agent:", agent.id, "with conversationId:", conversationId)
    
    // Reset all state for fresh modal open
    setMessages([])
    setNewMessage("")
    setIsActiveConversation(false)
    setHistoryLoaded(false)
    setErrorState(null)
    setLoadingInitialMessages(false)
    
    // Load conversation history or show opening message
    if (conversationId) {
      console.log("[Chat Preview] Found existing conversationId, loading history...")
      setIsActiveConversation(true)
      fetchInitialMessages(conversationId, true)
    } else {
      // No conversationId - show opening message for new conversation
      console.log("[Chat Preview] No conversationId, showing opening message...")
      if (agent.openingMessage) {
        setMessages([
          {
            id: "initial-ai-message",
            content: agent.openingMessage,
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      }
      setHistoryLoaded(true)
    }
  }, [open, agent.id, conversationId, fetchInitialMessages])

  // Handle conversationId changes during active conversation (don't reload messages)
  useEffect(() => {
    if (!open || !conversationId || !isActiveConversation) return

    console.log("[Chat Preview] ConversationId updated during active conversation:", conversationId, "- not reloading messages")
    // Don't reload messages, just let SSE handle new messages
  }, [conversationId, open, isActiveConversation])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    // Mark as active conversation when user sends first message
    setIsActiveConversation(true)

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: newMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setNewMessage("")
    setSending(true)

    try {
      const response = await apiCall("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: {
          agentId: agent.id,
          message: newMessage,
          conversationId: conversationId,
          history: messages.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.content,
          })),
          userId: "preview-user",
        },
      })

      // Update conversationId if backend returns a different one
      if (response.conversationId && response.conversationId !== conversationId) {
        console.log("[Chat Preview] Backend returned different conversationId:", {
          old: conversationId,
          new: response.conversationId,
          reason: !conversationId ? "first message" : "conversation changed"
        })
        setConversationId(response.conversationId)
        
        // Fetch the conversation history for this conversationId if it's a new conversation
        if (!conversationId) {
          console.log("[Chat Preview] Fetching conversation history for new conversation")
          fetchConversationHistory(response.conversationId)
        }
      } else if (response.conversationId) {
        console.log("[Chat Preview] Message sent to existing conversation:", response.conversationId, "- AI response will arrive via SSE")
      }

      // Check if handoff was created (AI won't respond)
      if (response.handoffCreated) {
        console.log("[Chat Preview] Handoff created, no AI response will be sent")
        setHandoffRequested(true)
        setConversationMode('handoff_requested')
        // Show a system message to inform the user
        const handoffMessage: Message = {
          id: `system-handoff-${Date.now()}`,
          content: `A human agent (${response.agentName}) has been notified and will assist you shortly.`,
          sender: "system",
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, handoffMessage])
      } else if (response.response && typeof response.response === 'string') {
        // Handle immediate API response (first message) to prevent waiting for SSE
        console.log("[Chat Preview] API included immediate AI response, checking for duplicates...")
        
        // Check if we already have this message from SSE
        const currentMessages = messages
        const duplicateExists = currentMessages.some(msg => 
          msg.content === response.response && 
          msg.sender === "ai" &&
          !msg.id?.startsWith('immediate-ai-') // Don't compare with other immediate messages
        )
        
        if (duplicateExists) {
          console.log("[Chat Preview] Immediate API response already exists from SSE, skipping duplicate")
        } else {
          console.log("[Chat Preview] Adding immediate API response")
          const immediateAiMessage: Message = {
            id: `immediate-ai-${Date.now()}`, // Special ID prefix to identify immediate responses
            content: response.response,
            sender: "ai",
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => {
            // Double-check for duplicates at the time of setting (race condition protection)
            const duplicateInPrev = prev.some(msg => 
              msg.content === response.response && 
              msg.sender === "ai" &&
              !msg.id?.startsWith('immediate-ai-')
            )
            
            if (duplicateInPrev) {
              console.log("[Chat Preview] Duplicate detected during setState, skipping immediate response")
              return prev
            }
            
            console.log("[Chat Preview] Adding immediate API response:", {
              id: immediateAiMessage.id,
              content: immediateAiMessage.content.substring(0, 50) + "...",
              totalMessages: prev.length + 1
            })
            return [...prev, immediateAiMessage]
          })
        }
      } else {
        console.log("[Chat Preview] No immediate response, waiting for AI response via SSE stream...")
      }
      // Subsequent AI responses will arrive via the SSE stream

    } catch (error) {
      console.error("Failed to send message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        sender: "ai",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev.filter(m => m.id !== userMessage.id), errorMessage])
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getSenderIcon = (sender: string) => {
    return sender === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />
  }

  const getSenderColor = (sender: string) => {
    if (sender === "ai") return "bg-blue-100 text-blue-800"
    if (sender === "user") return "bg-green-100 text-green-800"
    if (sender === "system") return "bg-gray-100 text-gray-800"
    return "bg-gray-100 text-gray-800"
  }

  // Handle handoff request
  const handleHandoffRequested = () => {
    console.log("[Chat Preview] Handoff requested for conversation:", conversationId)
    setHandoffRequested(true)
    setConversationMode('handoff_requested')
  }

  // Handle refresh conversation
  const handleRefreshConversation = async () => {
    if (!conversationId || refreshing) return
    
    setRefreshing(true)
    try {
      const headers = await getAuthHeaders()
      await apiCall(`/api/conversations/${conversationId}/messages`, {
        method: "DELETE",
        headers,
      })
      
      // Clear messages locally
      setMessages([])
      setHistoryLoaded(false)
      
      // Show the opening message again
      if (agent.openingMessage) {
        setMessages([
          {
            id: "initial-ai-message",
            content: agent.openingMessage,
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      }
      
      toast.success("Conversation refreshed")
    } catch (error) {
      console.error("Failed to refresh conversation:", error)
      toast.error("Failed to refresh conversation")
    } finally {
      setRefreshing(false)
    }
  }

  // Handle new conversation
  const handleNewConversation = async () => {
    if (!conversationId) return
    
    try {
      const headers = await getAuthHeaders()
      
      // Create new conversation
      const response = await apiCall("/api/conversations/new", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: {
          agentId: agent.id,
          source: "web"
        }
      })
      
      if (response?.conversation?.id) {
        // Update conversation ID
        setConversationId(response.conversation.id)
        
        // Clear messages and show opening message
        setMessages([])
        setHistoryLoaded(false)
        
        if (agent.openingMessage) {
          setMessages([
            {
              id: "initial-ai-message",
              content: agent.openingMessage,
              sender: "ai",
              timestamp: new Date().toISOString(),
            },
          ])
        }
        
        toast.success("New conversation created")
      }
    } catch (error) {
      console.error("Failed to create new conversation:", error)
      toast.error("Failed to create new conversation")
    }
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DialogTitle>Chat Preview - {agent.name}</DialogTitle>
              </div>
              <div className="flex items-center space-x-2">
                {conversationId && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleRefreshConversation}
                          disabled={refreshing || sending || loadingInitialMessages}
                          className="h-8 w-8"
                        >
                          {refreshing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear messages and start fresh</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleNewConversation}
                          disabled={sending || loadingInitialMessages}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create new conversation</p>
                      </TooltipContent>
                    </Tooltip>
                    {!handoffRequested && (
                      <HandoffRequestButton
                        conversationId={conversationId}
                        onHandoffRequested={handleHandoffRequested}
                        disabled={sending || loadingInitialMessages}
                      />
                    )}
                  </>
                )}
                <Badge variant="outline">{agent.tone}</Badge>
                <Badge variant="outline">{agent.language}</Badge>
                {conversationId && (
                  <Badge variant="secondary" className="text-xs">
                    {messages.length > 1 ? "History Loaded" : "New Chat"}
                  </Badge>
                )}
                {conversationId && (
                  <Badge 
                    variant={sseConnectionStatus ? "default" : "secondary"} 
                    className={`text-xs ${sseConnectionStatus ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-1 ${sseConnectionStatus ? "bg-green-500" : "bg-yellow-500"}`} />
                    {sseConnectionStatus ? "Live" : "Connecting..."}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 p-4 border rounded-md" ref={scrollAreaRef} data-testid="chat-messages-area">
            {loadingInitialMessages ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading chat history...</p>
                  <p className="text-xs">Please wait while we retrieve your messages</p>
                  {errorState && (
                    <p className="text-xs text-orange-600 mt-2">{errorState}</p>
                  )}
                </div>
              </div>
            ) : errorState && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50 text-red-500" />
                  <p className="text-sm text-red-600 mb-2">{errorState}</p>
                  <p className="text-xs mb-4">Unable to load conversation history</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchInitialMessages(conversationId!, true)}
                      disabled={loadingInitialMessages}
                    >
                      {loadingInitialMessages ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Retry Loading
                    </Button>
                    {agent.openingMessage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMessages([
                            {
                              id: "initial-ai-message",
                              content: agent.openingMessage!,
                              sender: "ai",
                              timestamp: new Date().toISOString(),
                            },
                          ])
                          setErrorState(null)
                        }}
                      >
                        Start New Chat
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {conversationId ? "No messages found in conversation" : `Start a conversation with ${agent.name}`}
                  </p>
                  <p className="text-xs">
                    {conversationId ? "The conversation history could not be loaded" : "Try asking about real estate or property inquiries"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getSenderColor(message.sender)}`}>
                      {getSenderIcon(message.sender)}
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-800">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type your message to ${agent.name}...`}
                disabled={sending || loadingInitialMessages}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim() || loadingInitialMessages} size="icon">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is a preview chat. Messages are not saved to your conversations.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  )
}
