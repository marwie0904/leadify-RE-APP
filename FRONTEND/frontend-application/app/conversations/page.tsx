"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/simple-auth-context"
import { apiCall } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMessageStreaming } from "@/hooks/use-message-streaming"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare } from "lucide-react"

// Lazy load conversation components
const ConversationsList = lazy(() => import("@/components/conversations/conversations-list").then(mod => ({ default: mod.ConversationsList })))
const ChatInterface = lazy(() => import("@/components/conversations/chat-interface").then(mod => ({ default: mod.ChatInterface })))

// Loading component for conversations was removed as unused

// Lead interface was removed as unused

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
  agentId?: string
  handoff?: boolean
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
  const [_loadingMessages, setLoadingMessages] = useState(false)
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<Set<string>>(new Set())

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
      const response = await apiCall(`/api/conversations/${conversationId}/messages`, {
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

      // Fetch conversations and leads in parallel
      const [conversationsResponse, leadsResponse] = await Promise.all([
        apiCall("/api/conversations", { headers: authHeaders }).catch(() => ({ conversations: [] })),
        apiCall("/api/leads", { headers: authHeaders }).catch(() => ({ leads: [] })),
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

      // Map conversations with lead data and filter out handoff conversations
      const transformedConversations = conversationsData
        .filter((conversation: any) => !conversation.handoff) // Exclude conversations in handoff
        .map((conversation: any) => {
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
            agentId: conversation.agent_id || "",
            handoff: false, // These are all non-handoff conversations now
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
    
    setMessages(prev => [...prev, userMessage])

    try {
      const authHeaders = await getAuthHeaders()
      const response = await apiCall("/api/chat", {
        method: "POST",
        headers: authHeaders,
        body: {
          conversationId: selectedConversation,
          message: content,
        },
      })
      
      // Check if handoff was created (AI won't respond)
      if (response?.handoffCreated) {
        console.log("[Conversations] Handoff created, no AI response will be sent")
        // Show a system message to inform the user
        const handoffMessage: Message = {
          id: `system-handoff-${Date.now()}`,
          content: `A human agent (${response.agentName}) has been notified and will assist you shortly.`,
          sender: "system",
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, handoffMessage])
      }
      // Otherwise AI response will arrive via SSE stream
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    }
  }

  const handleRefreshConversation = async () => {
    if (!selectedConversation) return

    try {
      const authHeaders = await getAuthHeaders()
      await apiCall(`/api/conversations/${selectedConversation}/messages`, {
        method: "DELETE",
        headers: authHeaders,
      })
      
      // Clear messages locally
      setMessages([])
      
      // Mark as not loaded so it doesn't fetch old messages
      setInitialMessagesLoaded(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedConversation)
        return newSet
      })
      
      // Refetch conversations to update UI
      await fetchConversations()
    } catch (error) {
      console.error("Failed to refresh conversation:", error)
      throw error
    }
  }

  const handleNewConversation = async () => {
    if (!selectedConversation) return
    
    // Get the agent ID from the current conversation
    const currentConv = conversations.find(c => c.id === selectedConversation)
    if (!currentConv) return
    
    // We need to get the agent ID - it might be stored in a different property
    // For now, we'll need to fetch it from the conversation details
    try {
      const authHeaders = await getAuthHeaders()
      
      // Fetch full conversation details to get agent ID
      const convDetails = await apiCall(`/api/conversations/${selectedConversation}`, {
        headers: authHeaders,
      })
      
      const agentId = convDetails?.agent_id || convDetails?.agents?.id
      
      if (!agentId) {
        console.error("No agent ID found for conversation")
        return
      }
      
      // Create new conversation
      const response = await apiCall("/api/conversations/new", {
        method: "POST",
        headers: authHeaders,
        body: {
          agentId: agentId,
          source: "web"
        }
      })
      
      if (response?.conversation?.id) {
        // Select the new conversation
        setSelectedConversation(response.conversation.id)
        setMessages([])
        
        // Refresh conversations list
        await fetchConversations()
      }
    } catch (error) {
      console.error("Failed to create new conversation:", error)
      throw error
    }
  }


  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading conversations...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Conversations</h1>
        </div>
        <p className="text-gray-600 ml-10">Engage with leads through AI-powered chat conversations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 bg-white border-gray-200">
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

        <Card className="md:col-span-2 bg-white border-gray-200">
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
                  onHandoffRequested={() => {
                    console.log("[Conversations] Handoff requested for conversation:", selectedConversation)
                  }}
                  onRefreshConversation={handleRefreshConversation}
                  onNewConversation={handleNewConversation}
                  agentId={conversations.find(c => c.id === selectedConversation)?.agentId || null}
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
