"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMessageStreaming } from "@/hooks/use-message-streaming"
import { Skeleton } from "@/components/ui/skeleton"
import { useSendMessage } from "@/src/hooks/mutations/use-send-message"
import { useEndConversation } from "@/src/hooks/mutations/use-end-conversation"
import { migrateEndpoint, shouldUseMigratedEndpoint } from "@/lib/api/migration-helper"

// Lazy load conversation components
const ConversationsList = lazy(() => import("@/components/conversations/conversations-list").then(mod => ({ default: mod.ConversationsList })))
const ChatInterface = lazy(() => import("@/components/conversations/chat-interface").then(mod => ({ default: mod.ChatInterface })))

// Loading component for conversations
function ConversationsLoading() {
  return (
    <div className="flex h-screen">
      {/* Conversations List Skeleton */}
      <div className="w-80 border-r bg-background">
        <div className="p-4">
          <Skeleton className="h-10 w-full mb-4" />
        </div>
        <div className="space-y-2 p-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Interface Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

interface Lead {
  id: string
  conversation_id: string
  full_name: string
  lead_classification: string
  source: string
}

interface Conversation {
  id: string
  title: string
  leadName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: "active" | "closed"
  source?: string
  classification?: string
}

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

export default function ConversationsPage() {
  const { user, getAuthHeaders } = useAuth()
  const searchParams = useSearchParams()
  const initialConversationId = searchParams.get("conversationId")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<Set<string>>(new Set())

  // Use React Query mutations for message operations
  const sendMessage = useSendMessage()
  const endConversation = useEndConversation()

  // Get auth headers and store them
  useEffect(() => {
    const fetchAuthHeaders = async () => {
      const headers = await getAuthHeaders()
      setAuthHeaders(headers)
    }
    fetchAuthHeaders()
  }, [getAuthHeaders])

  // Create a more robust message deduplication system
  const createMessageKey = (message: Message) => {
    // Create a unique key based on content, sender, and rounded timestamp (to nearest minute)
    const roundedTime = Math.floor(new Date(message.timestamp).getTime() / 60000) * 60000
    return `${message.sender}-${message.content.trim()}-${roundedTime}`
  }

  // Handle new messages from streaming
  const handleNewMessage = useCallback((newMessage: Message) => {
    // User messages should never come from streaming (they're added immediately when sent)
    if (newMessage.sender === "user") {
      console.log("[Conversations] Ignoring user message from streaming (should only come from frontend):", newMessage.content.substring(0, 50))
      return
    }
    
    console.log("[Conversations] Received new message from streaming:", newMessage)
    setMessages(prev => {
      console.log("[Conversations] Current messages:", prev.length)
      
      // Create message keys for comparison
      const newMessageKey = createMessageKey(newMessage)
      
      // More aggressive duplicate detection for AI messages
      const messageExists = prev.some(msg => {
        // Check by ID first (if both have valid IDs from backend)
        if (msg.id && newMessage.id && msg.id === newMessage.id && 
            msg.id !== 'undefined' && newMessage.id !== 'undefined' &&
            !msg.id.startsWith('user-') && !msg.id.startsWith('ai-') &&
            !newMessage.id.startsWith('user-') && !newMessage.id.startsWith('ai-')) {
          console.log("[Conversations] Duplicate found by backend ID:", msg.id)
          return true
        }
        
        // Check by message key (content + sender + time)
        const existingMessageKey = createMessageKey(msg)
        if (existingMessageKey === newMessageKey) {
          console.log("[Conversations] Duplicate found by message key:", newMessageKey)
          return true
        }
        
        // Check exact content match with same sender (regardless of time)
        // This is the most important check for AI messages
        if (msg.content.trim() === newMessage.content.trim() && msg.sender === newMessage.sender) {
          console.log("[Conversations] Duplicate found by exact content match:", {
            content: msg.content.substring(0, 50),
            sender: msg.sender
          })
          return true
        }
        
        return false
      })
      
      if (messageExists) {
        console.log("[Conversations] Duplicate message detected, skipping:", {
          id: newMessage.id,
          content: newMessage.content.substring(0, 50),
          sender: newMessage.sender,
          key: newMessageKey
        })
        return prev
      }
      
      console.log("[Conversations] Adding new message:", {
        id: newMessage.id,
        content: newMessage.content.substring(0, 50),
        sender: newMessage.sender,
        key: newMessageKey
      })
      return [...prev, newMessage]
    })
  }, [])

  // Initialize message streaming
  useMessageStreaming({
    conversationId: selectedConversation,
    onNewMessage: handleNewMessage,
    authHeaders
  })

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  useEffect(() => {
    // Check for conversationId in URL parameters
    const conversationId = searchParams.get("conversationId")
    if (conversationId && conversations.length > 0) {
      setSelectedConversation(conversationId)
    }
  }, [searchParams, conversations])

  useEffect(() => {
    if (selectedConversation && !initialMessagesLoaded.has(selectedConversation)) {
      setMessages([]) // Clear messages when switching to a new conversation
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  const fetchMessages = async (conversationId: string) => {
    console.log(`[Conversations] Fetching initial messages for ${conversationId}`)
    setLoadingMessages(true)
    try {
      const authHeaders = await getAuthHeaders()
      
      // Use migrated endpoint for fetching messages
      const endpoint = shouldUseMigratedEndpoint()
        ? `/api/v1/conversations/${conversationId}/messages`
        : `/api/conversations/${conversationId}/messages`
      
      const response = await apiCall(endpoint, {
        headers: authHeaders,
      })

      const messagesData = response?.messages && Array.isArray(response.messages) ? response.messages : Array.isArray(response) ? response : []

      const transformedMessages = messagesData.map((message: any) => ({
        id: message.id || `msg-${Date.now()}-${Math.random()}`,
        content: message.content || "",
        sender: message.sender || "user",
        timestamp: message.timestamp || message.sent_at || new Date().toISOString(),
      }))

      setMessages(transformedMessages)
      setInitialMessagesLoaded(prev => new Set(prev).add(conversationId))
    } catch (error) {
      console.error("Failed to fetch messages:", error)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchConversations = async () => {
    try {
      setError(null)
      const authHeaders = await getAuthHeaders()

      // Use migrated endpoints for fetching conversations and leads
      const conversationsEndpoint = shouldUseMigratedEndpoint()
        ? "/api/v1/conversations"
        : "/api/conversations"
      
      const leadsEndpoint = shouldUseMigratedEndpoint()
        ? "/api/v1/leads"
        : "/api/leads"

      // Fetch conversations and leads in parallel
      const [conversationsResponse, leadsResponse] = await Promise.all([
        apiCall(conversationsEndpoint, { headers: authHeaders }).catch(() => ({ conversations: [] })),
        apiCall(leadsEndpoint, { headers: authHeaders }).catch(() => ({ leads: [] })),
      ])

      // Process conversations
      let conversationsData = []
      if (conversationsResponse?.conversations && Array.isArray(conversationsResponse.conversations)) {
        conversationsData = conversationsResponse.conversations
      } else if (Array.isArray(conversationsResponse)) {
        conversationsData = conversationsResponse
      }

      // Process leads
      let leadsData = []
      if (leadsResponse?.leads && Array.isArray(leadsResponse.leads)) {
        leadsData = leadsResponse.leads
      } else if (Array.isArray(leadsResponse)) {
        leadsData = leadsResponse
      }

      // Map conversations with lead data
      const transformedConversations = conversationsData.map((conversation: any) => {
        const correspondingLead = leadsData.find((lead: any) => lead.conversation_id === conversation.id)
        
        // Debug source values
        console.log(`[CONVERSATIONS] Conversation ${conversation.id} source:`, {
          lead_source: correspondingLead?.source,
          conversation_source: conversation.source,
          final_source: correspondingLead?.source || "Unknown"
        });

        return {
          id: conversation.id || "",
          title: correspondingLead?.full_name || conversation.title || "Untitled Conversation",
          leadName: correspondingLead?.full_name || "Unknown Lead",
          lastMessage: conversation.lastMessage || "",
          lastMessageAt: conversation.lastMessageAt || new Date().toISOString(),
          unreadCount: conversation.unreadCount || 0,
          status: conversation.status || "active",
          source: correspondingLead?.source || "Unknown",
          classification: correspondingLead?.lead_classification || "warm",
        }
      })

      setConversations(transformedConversations)
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
      setError("Failed to load conversations")
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: content,
      sender: "user",
      timestamp: new Date().toISOString(),
    }
    
    // Add user message optimistically
    setMessages(prev => [...prev, userMessage])

    try {
      // Use React Query mutation for sending messages
      await sendMessage.mutateAsync({
        conversationId: selectedConversation,
        content: content,
      })
      // AI response will arrive via SSE stream
    } catch (error) {
      console.error("Failed to send message:", error)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    }
  }

  const handleEndConversation = async (reason: string) => {
    if (!selectedConversation) return

    try {
      await endConversation.mutateAsync({
        conversationId: selectedConversation,
        reason: reason,
        metadata: {
          endedFrom: 'conversations_page',
          userInitiated: true
        }
      })
      
      // Refresh conversations list to reflect status change
      await fetchConversations()
      
      // Clear the selected conversation
      setSelectedConversation(null)
      setMessages([])
    } catch (error) {
      console.error("Failed to end conversation:", error)
    }
  }


  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading conversations...</div>
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations ({conversations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ConversationsList
                conversations={conversations}
                selectedId={selectedConversation}
                onSelect={setSelectedConversation}
              />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedConversation
                ? conversations.find((c) => c.id === selectedConversation)?.title || "Chat"
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage}
                  conversationId={selectedConversation}
                  onEndConversation={handleEndConversation}
                  onHandoffRequested={() => {
                    console.log("[Conversations] Handoff requested for conversation:", selectedConversation)
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a conversation to start chatting
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
