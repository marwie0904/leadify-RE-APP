"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Headphones,
  Send,
  CheckCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Archive,
  Star,
  Reply
} from "lucide-react"
import { toast } from "sonner"

// Mock support request data
const mockSupportRequests = [
  {
    id: "support-1",
    conversationId: "conv-1",
    user: "Alice Brown",
    userEmail: "alice@techcorp.com",
    subject: "Cannot access dashboard",
    status: "open",
    priority: "urgent",
    assignedTo: null,
    createdAt: "2024-03-15T14:30:00",
    lastMessageAt: "2024-03-15T15:00:00",
    unreadCount: 2,
    messages: [
      {
        id: "msg-1",
        sender: "user",
        senderName: "Alice Brown",
        content: "I'm unable to access my dashboard. When I try to login, I get an error message saying 'Access Denied'.",
        timestamp: "2024-03-15T14:30:00"
      },
      {
        id: "msg-2",
        sender: "system",
        senderName: "System",
        content: "Support ticket created. An agent will assist you shortly.",
        timestamp: "2024-03-15T14:30:01"
      }
    ]
  },
  {
    id: "support-2",
    conversationId: "conv-2",
    user: "Bob Wilson",
    userEmail: "bob@realestate.com",
    subject: "Billing inquiry",
    status: "in_progress",
    priority: "normal",
    assignedTo: "Support Agent 1",
    createdAt: "2024-03-15T13:00:00",
    lastMessageAt: "2024-03-15T14:00:00",
    unreadCount: 0,
    messages: [
      {
        id: "msg-3",
        sender: "user",
        senderName: "Bob Wilson",
        content: "I was charged twice for my subscription this month. Can you please help me resolve this?",
        timestamp: "2024-03-15T13:00:00"
      },
      {
        id: "msg-4",
        sender: "support_agent",
        senderName: "Support Agent 1",
        content: "Hi Bob, I'm looking into your billing issue. Let me check your account details.",
        timestamp: "2024-03-15T13:15:00"
      },
      {
        id: "msg-5",
        sender: "support_agent",
        senderName: "Support Agent 1",
        content: "I can see the duplicate charge. I'll process a refund for you right away.",
        timestamp: "2024-03-15T14:00:00"
      }
    ]
  },
  {
    id: "support-3",
    conversationId: "conv-3",
    user: "Carol Davis",
    userEmail: "carol@homefind.com",
    subject: "Feature request - Export functionality",
    status: "open",
    priority: "normal",
    assignedTo: null,
    createdAt: "2024-03-15T12:00:00",
    lastMessageAt: "2024-03-15T12:00:00",
    unreadCount: 1,
    messages: [
      {
        id: "msg-6",
        sender: "user",
        senderName: "Carol Davis",
        content: "It would be great if we could export conversation history to PDF. Is this something you're planning to add?",
        timestamp: "2024-03-15T12:00:00"
      }
    ]
  },
  {
    id: "support-4",
    conversationId: "conv-4",
    user: "David Lee",
    userEmail: "david@property.com",
    subject: "Integration help needed",
    status: "resolved",
    priority: "normal",
    assignedTo: "Support Agent 2",
    createdAt: "2024-03-14T10:00:00",
    lastMessageAt: "2024-03-14T16:00:00",
    unreadCount: 0,
    messages: [
      {
        id: "msg-7",
        sender: "user",
        senderName: "David Lee",
        content: "How do I integrate the chat widget into my website?",
        timestamp: "2024-03-14T10:00:00"
      },
      {
        id: "msg-8",
        sender: "support_agent",
        senderName: "Support Agent 2",
        content: "Hi David! I'll help you with the integration. First, you'll need to get your API key from the settings page.",
        timestamp: "2024-03-14T10:30:00"
      },
      {
        id: "msg-9",
        sender: "support_agent",
        senderName: "Support Agent 2",
        content: "Here's the embed code: <script src='https://widget.leadify.ai/embed.js' data-key='YOUR_API_KEY'></script>",
        timestamp: "2024-03-14T10:35:00"
      },
      {
        id: "msg-10",
        sender: "user",
        senderName: "David Lee",
        content: "Perfect! That worked. Thank you so much!",
        timestamp: "2024-03-14T15:45:00"
      },
      {
        id: "msg-11",
        sender: "support_agent",
        senderName: "Support Agent 2",
        content: "You're welcome! Feel free to reach out if you need any more help.",
        timestamp: "2024-03-14T16:00:00"
      }
    ]
  },
  {
    id: "support-5",
    conversationId: "conv-5",
    user: "Emma Wilson",
    userEmail: "emma@luxury.com",
    subject: "Performance issues",
    status: "in_progress",
    priority: "urgent",
    assignedTo: "Support Agent 1",
    createdAt: "2024-03-15T09:00:00",
    lastMessageAt: "2024-03-15T11:00:00",
    unreadCount: 1,
    messages: [
      {
        id: "msg-12",
        sender: "user",
        senderName: "Emma Wilson",
        content: "The application has been extremely slow for the past 2 days. It's affecting our business operations.",
        timestamp: "2024-03-15T09:00:00"
      },
      {
        id: "msg-13",
        sender: "support_agent",
        senderName: "Support Agent 1",
        content: "Hi Emma, I understand the urgency. We're investigating the performance issues. Can you tell me which specific features are slow?",
        timestamp: "2024-03-15T09:30:00"
      },
      {
        id: "msg-14",
        sender: "user",
        senderName: "Emma Wilson",
        content: "The dashboard takes over 30 seconds to load, and the chat interface is lagging.",
        timestamp: "2024-03-15T10:00:00"
      },
      {
        id: "msg-15",
        sender: "support_agent",
        senderName: "Support Agent 1",
        content: "Thank you for the details. Our engineering team is working on a fix. We expect to have this resolved within the next 2 hours.",
        timestamp: "2024-03-15T11:00:00"
      }
    ]
  }
]

const supportAgents = [
  "Support Agent 1",
  "Support Agent 2",
  "Support Agent 3",
  "Technical Specialist"
]

const priorityColors = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  normal: "bg-blue-100 text-blue-700 border-blue-300"
}

const statusColors = {
  open: "bg-gray-100 text-gray-700 border-gray-300",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-300",
  resolved: "bg-green-100 text-green-700 border-green-300"
}

export default function SupportRequestsPage() {
  const [supportRequests, setSupportRequests] = useState(mockSupportRequests)
  const [selectedRequest, setSelectedRequest] = useState<typeof mockSupportRequests[0] | null>(mockSupportRequests[0])
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Filter requests
  const filteredRequests = supportRequests.filter(request => {
    const matchesSearch = 
      request.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Stats
  const stats = {
    total: supportRequests.length,
    open: supportRequests.filter(r => r.status === "open").length,
    inProgress: supportRequests.filter(r => r.status === "in_progress").length,
    resolved: supportRequests.filter(r => r.status === "resolved").length,
    urgent: supportRequests.filter(r => r.priority === "urgent").length
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRequest) return

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "support_agent",
      senderName: "Support Team",
      content: messageInput,
      timestamp: new Date().toISOString()
    }

    setSupportRequests(supportRequests.map(request => 
      request.id === selectedRequest.id
        ? {
            ...request,
            messages: [...request.messages, newMessage],
            lastMessageAt: new Date().toISOString(),
            status: request.status === "open" ? "in_progress" : request.status
          }
        : request
    ))

    // Update selected request
    if (selectedRequest) {
      setSelectedRequest({
        ...selectedRequest,
        messages: [...selectedRequest.messages, newMessage],
        lastMessageAt: new Date().toISOString(),
        status: selectedRequest.status === "open" ? "in_progress" : selectedRequest.status
      })
    }

    setMessageInput("")
    toast.success("Message sent")
  }

  const handleMarkAsResolved = (requestId: string) => {
    setSupportRequests(supportRequests.map(request => 
      request.id === requestId
        ? { ...request, status: "resolved" }
        : request
    ))
    
    if (selectedRequest?.id === requestId) {
      setSelectedRequest({ ...selectedRequest, status: "resolved" })
    }
    
    toast.success("Support request marked as resolved")
  }

  const handleAssignAgent = (requestId: string, agent: string) => {
    setSupportRequests(supportRequests.map(request => 
      request.id === requestId
        ? { ...request, assignedTo: agent, status: "in_progress" }
        : request
    ))
    
    if (selectedRequest?.id === requestId) {
      setSelectedRequest({ ...selectedRequest, assignedTo: agent, status: "in_progress" })
    }
    
    toast.success(`Assigned to ${agent}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Headphones className="h-8 w-8 text-cyan-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Support Requests</h1>
          </div>
          <p className="text-gray-600 mt-1">Handle customer support inquiries and requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50">
            {stats.inProgress} Active
          </Badge>
          <Badge variant="outline" className="bg-red-50">
            {stats.urgent} Urgent
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Support Requests List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Support Queue</CardTitle>
            <div className="space-y-2 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRequest?.id === request.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{request.subject}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{request.user}</p>
                      </div>
                      {request.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {request.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={priorityColors[request.priority as keyof typeof priorityColors]}>
                          {request.priority}
                        </Badge>
                        <Badge variant="outline" className={statusColors[request.status as keyof typeof statusColors]}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(request.lastMessageAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {request.assignedTo && (
                      <p className="text-xs text-green-600 mt-2">
                        Assigned to: {request.assignedTo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedRequest ? selectedRequest.subject : "Select a support request"}
                </CardTitle>
                {selectedRequest && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRequest.user} • {selectedRequest.userEmail}
                  </p>
                )}
              </div>
              {selectedRequest && (
                <div className="flex items-center space-x-2">
                  {selectedRequest.status !== "resolved" && (
                    <>
                      {!selectedRequest.assignedTo ? (
                        <Select
                          onValueChange={(value) => handleAssignAgent(selectedRequest.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assign to agent..." />
                          </SelectTrigger>
                          <SelectContent>
                            {supportAgents.map(agent => (
                              <SelectItem key={agent} value={agent}>
                                {agent}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="bg-green-50">
                          Assigned to: {selectedRequest.assignedTo}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsResolved(selectedRequest.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedRequest ? (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] border rounded-lg p-4 bg-gray-50/50">
                  <div className="space-y-4">
                    {selectedRequest.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user" ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender === "user"
                              ? "bg-white border"
                              : message.sender === "system"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-blue-100 text-blue-900 border border-blue-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium">
                              {message.senderName}
                            </span>
                            <span className={`text-xs ${
                              message.sender === "user" ? "text-muted-foreground" : 
                              message.sender === "system" ? "text-gray-500" : 
                              "text-blue-600"
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {selectedRequest.status !== "resolved" && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type your response..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {selectedRequest.status === "resolved" && (
                  <div className="text-center py-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700">This support request has been resolved</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                <div className="text-center">
                  <Headphones className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a support request</h3>
                  <p className="text-sm">Choose a request from the queue to start helping customers</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}