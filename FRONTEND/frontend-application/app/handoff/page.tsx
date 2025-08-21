"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  MessageSquare, 
  Loader2,
  User,
  HandHeart,
  RotateCcw,
  Eye,
  Building
} from "lucide-react"
import { useAuth } from "@/contexts/simple-auth-context"
import { apiCall } from "@/lib/api"
import { toast } from "sonner"
import { useMessageStreaming } from "@/hooks/use-message-streaming"

interface HandoffConversation {
  id: string
  title: string
  leadName: string
  lastMessage: string
  lastMessageAt: string
  status: "pending" | "assigned" | "resolved"
  priority: "low" | "medium" | "high"
  handoffReason?: string
  assignedAgent?: string
  assignedAgentName?: string
  source?: string
  classification?: string
}

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

export default function HandoffPage() {
  const { user, canAccessHumanDashboard, getAuthHeaders } = useAuth()
  const searchParams = useSearchParams()
  const initialConversationId = searchParams.get("conversationId")

  const [handoffConversations, setHandoffConversations] = useState<HandoffConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'personal' | 'organization'>('personal')
  const [transferring, setTransferring] = useState<string | null>(null)

  // Access control with debug logging
  console.log("[Handoff] Access Control Debug:", {
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.role,
    isHumanAgent: user?.isHumanAgent,
    canAccessHumanDashboard,
    shouldAllowAccess: canAccessHumanDashboard,
    timestamp: new Date().toISOString()
  })

  // Determine if user is admin (can see organization view)
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator'

  // Auto-set view mode based on user role
  useEffect(() => {
    if (user && !isAdmin) {
      setViewMode('personal')
    }
  }, [user, isAdmin])

  // Get auth headers and store them
  useEffect(() => {
    const fetchAuthHeaders = async () => {
      const headers = await getAuthHeaders()
      setAuthHeaders(headers)
    }
    fetchAuthHeaders()
  }, [getAuthHeaders])

  // Handle new messages from streaming
  const handleNewMessage = useCallback((newMessage: Message) => {
    if (newMessage.sender === "user") {
      console.log("[Handoff] Ignoring user message from streaming:", newMessage.content.substring(0, 50))
      return
    }
    
    console.log("[Handoff] Received new message from streaming:", newMessage)
    setMessages(prev => {
      const messageExists = prev.some(msg => 
        msg.id === newMessage.id || 
        (msg.content.trim() === newMessage.content.trim() && msg.sender === newMessage.sender)
      )
      
      if (messageExists) {
        console.log("[Handoff] Duplicate message detected, skipping")
        return prev
      }
      
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
      fetchHandoffConversations()
    }
  }, [user, viewMode])

  useEffect(() => {
    const conversationId = searchParams.get("conversationId")
    if (conversationId && handoffConversations.length > 0) {
      setSelectedConversation(conversationId)
    }
  }, [searchParams, handoffConversations])

  useEffect(() => {
    if (selectedConversation && !initialMessagesLoaded.has(selectedConversation)) {
      setMessages([])
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  const fetchMessages = async (conversationId: string) => {
    console.log(`[Handoff] Fetching initial messages for ${conversationId}`)
    setLoadingMessages(true)
    try {
      const authHeaders = await getAuthHeaders()
      const response = await apiCall(`/api/conversations/${conversationId}/messages`, {
        headers: authHeaders,
      })

      const messagesData = response?.messages && Array.isArray(response.messages) ? response.messages : []

      const transformedMessages = messagesData.map((message: any) => ({
        id: message.id || `msg-${Date.now()}-${Math.random()}`,
        content: message.content || "",
        sender: message.sender || "user",
        timestamp: message.timestamp || message.sent_at || new Date().toISOString(),
      }))

      setMessages(transformedMessages)
      setInitialMessagesLoaded(prev => new Set(prev).add(conversationId))
    } catch (error) {
      console.error("Failed to fetch handoff messages:", error)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchHandoffConversations = async () => {
    try {
      setError(null)
      const authHeaders = await getAuthHeaders()

      console.log(`[Handoff] Fetching handoff conversations with viewMode: ${viewMode}`)
      const response = await apiCall("/api/conversations/handoffs", { 
        headers: authHeaders 
      })

      console.log("[Handoff] API Response:", response)

      // The API returns viewMode automatically based on user role
      const apiViewMode = response?.viewMode || 'personal'
      if (apiViewMode !== viewMode) {
        console.log(`[Handoff] Server returned viewMode: ${apiViewMode}, updating client`)
        setViewMode(apiViewMode)
      }

      let conversationsData = []
      if (response?.conversations && Array.isArray(response.conversations)) {
        conversationsData = response.conversations
      } else if (Array.isArray(response)) {
        conversationsData = response
      }

      const transformedConversations = conversationsData.map((conversation: any) => ({
        id: conversation.id || "",
        title: conversation.user_name || "Untitled Handoff",
        leadName: conversation.user_name || "Unknown User",
        lastMessage: conversation.last_message || "",
        lastMessageAt: conversation.last_message_at || conversation.updated_at || new Date().toISOString(),
        status: conversation.handoff_details?.status || 'pending',
        priority: conversation.priority || 'normal',
        handoffReason: conversation.handoff_details?.reason || "Human assistance requested",
        assignedAgent: conversation.assigned_human_agent_id,
        assignedAgentName: conversation.assigned_agent_name,
        source: conversation.source || "web",
        classification: "warm",
        leadInfo: conversation.lead_info,
      }))

      setHandoffConversations(transformedConversations)
    } catch (error) {
      console.error("Failed to fetch handoff conversations:", error)
      setError("Failed to load handoff conversations")
      setHandoffConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleTransferToAI = async (conversationId: string) => {
    if (!conversationId) return

    setTransferring(conversationId)
    try {
      const authHeaders = await getAuthHeaders()
      const response = await apiCall(`/api/conversations/${conversationId}/transfer-to-ai`, {
        method: "POST",
        headers: authHeaders,
      })

      console.log("[Handoff] Transfer to AI response:", response)
      toast.success("Conversation transferred back to AI successfully")
      
      // Refresh the conversations list
      fetchHandoffConversations()
      
      // Clear selected conversation if it was transferred
      if (selectedConversation === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error: any) {
      console.error("Failed to transfer conversation to AI:", error)
      const errorMessage = error.message || "Failed to transfer conversation. Please try again."
      toast.error(errorMessage)
    } finally {
      setTransferring(null)
    }
  }

  const canTransferConversation = (_conversation: HandoffConversation) => {
    if (isAdmin) return true // Admins can transfer any conversation
    if (viewMode === 'personal') return true // In personal view, user can only see their own conversations
    return false
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
      await apiCall("/api/chat", {
        method: "POST",
        headers: authHeaders,
        body: {
          conversationId: selectedConversation,
          message: content,
        },
      })
      // Human agent response will arrive via SSE stream
    } catch (error) {
      console.error("Failed to send handoff message:", error)
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
      toast.error("Failed to send message. Please try again.")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "assigned": return "bg-blue-100 text-blue-800"
      case "resolved": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800"
      case "high": return "bg-orange-100 text-orange-800"
      case "normal": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (!user) {
    console.log("[Handoff] Access denied - no user")
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the handoff dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!canAccessHumanDashboard) {
    console.log("[Handoff] Access denied - insufficient permissions:", {
      userRole: user.role,
      isHumanAgent: user.isHumanAgent,
      canAccess: canAccessHumanDashboard
    })
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the handoff dashboard. 
            This page is only available to human agents and administrators.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading handoff conversations...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <HandHeart className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Handoff Conversations</h1>
          </div>
          <p className="text-gray-600 ml-10">Handle complex inquiries requiring human agent assistance</p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              {viewMode === 'personal' ? (
                <><User className="h-3 w-3 mr-1" /> Personal View</>
              ) : (
                <><Building className="h-3 w-3 mr-1" /> Organization View</>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'personal' ? 'organization' : 'personal')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Switch to {viewMode === 'personal' ? 'Organization' : 'Personal'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 bg-white border-gray-200">
          <CardHeader>
            <CardTitle>Handoff Queue ({handoffConversations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {handoffConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedConversation === conversation.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm truncate">{conversation.leadName}</h3>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(conversation.priority)}`}>
                      {conversation.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{conversation.source}</span>
                    <span>{new Date(conversation.lastMessageAt).toLocaleDateString()}</span>
                  </div>
                  {conversation.handoffReason && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Reason: {conversation.handoffReason}
                    </p>
                  )}
                  {conversation.assignedAgentName && viewMode === 'organization' && (
                    <p className="text-xs text-green-600 mt-1">
                      Assigned to: {conversation.assignedAgentName}
                    </p>
                  )}
                  {conversation.status === 'assigned' && viewMode === 'personal' && (
                    <p className="text-xs text-green-600 mt-1">
                      Assigned to you
                    </p>
                  )}
                </div>
              ))}
              {handoffConversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <HandHeart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No handoff conversations</p>
                  <p className="text-xs">Conversations requiring human assistance will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedConversation
                  ? handoffConversations.find((c) => c.id === selectedConversation)?.title || "Handoff Chat"
                  : "Select a handoff conversation"}
              </CardTitle>
              {selectedConversation && canTransferConversation(handoffConversations.find((c) => c.id === selectedConversation)!) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTransferToAI(selectedConversation)}
                  disabled={transferring === selectedConversation}
                >
                  {transferring === selectedConversation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Transfer to AI
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                <div className="h-96 border rounded-lg p-4 overflow-y-auto bg-gray-50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.sender === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white border'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages in this handoff conversation</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your response..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleSendMessage(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      handleSendMessage(input.value)
                      input.value = ''
                    }
                  }}>
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <HandHeart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a handoff conversation</h3>
                  <p className="text-sm">Choose a conversation from the queue to start handling the handoff</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}