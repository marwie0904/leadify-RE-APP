"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MessageSquare,
  Clock,
  User,
  Bot,
  Zap,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Globe,
  Facebook,
  Code,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  DollarSign,
  Calculator
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockConversationsData } from "@/lib/test-data"

interface Message {
  id: string
  role: string
  content: string
  created_at: string
  total_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
}

interface Conversation {
  id: string
  agent_id: string
  agent_name: string
  user_id: string
  source: string
  status: string
  started_at: string
  ended_at?: string
  message_count: number
  total_tokens: number
  prompt_tokens?: number
  completion_tokens?: number
  cost_estimate?: number
  total_cost?: number
  average_cost_per_message?: number
  last_message?: string
  last_message_at?: string
  messages?: Message[]
}

interface ConversationStats {
  total_conversations: number
  active_conversations: number
  total_tokens_used: number
  average_tokens_per_conversation: number
  total_cost_estimate: number
  average_cost_per_conversation: number
  conversations_by_source: Record<string, number>
}

export default function OrganizationConversationsPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "tokens" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  
  const fetchConversations = async () => {
    try {
      // Check for test mode
      const isTestMode = typeof window !== 'undefined' && localStorage.getItem('test_mode') === 'true'
      
      if (isTestMode) {
        // Use mock data in test mode
        const processedConversations = mockConversationsData.conversations.map((conv: any) => ({
          ...conv,
          cost_estimate: conv.totalCost || 0,
          user_id: conv.user_email || 'user@example.com'
        }))
        setConversations(processedConversations)
        setStats(mockConversationsData.stats as ConversationStats)
        setError(null)
        setLoading(false)
        setRefreshing(false)
        return
      }
      
      const token = localStorage.getItem('admin_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/conversations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }
      
      const data = await response.json()
      
      // Process conversations data
      const processedConversations: Conversation[] = data.conversations?.map((conv: any) => ({
        id: conv.id,
        agent_id: conv.agent_id,
        agent_name: conv.agent_name || 'Unknown Agent',
        user_id: conv.user_id,
        source: conv.source,
        status: conv.status,
        started_at: conv.started_at,
        ended_at: conv.ended_at,
        message_count: conv.message_count || 0,
        total_tokens: conv.total_tokens || 0,
        prompt_tokens: conv.prompt_tokens || 0,
        completion_tokens: conv.completion_tokens || 0,
        cost_estimate: conv.total_cost || calculateCost(conv.total_tokens || 0),
        total_cost: conv.total_cost || 0,
        average_cost_per_message: conv.average_cost_per_message || 0,
        last_message: conv.messages?.[conv.messages.length - 1]?.content,
        last_message_at: conv.messages?.[conv.messages.length - 1]?.created_at,
        messages: conv.messages || []
      })) || []
      
      // Calculate statistics
      const totalTokens = processedConversations.reduce((sum, c) => sum + c.total_tokens, 0)
      const activeCount = processedConversations.filter(c => c.status === 'active').length
      
      const sourceCounts = processedConversations.reduce((acc, conv) => {
        acc[conv.source] = (acc[conv.source] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const totalCost = processedConversations.reduce((sum, c) => sum + (c.total_cost || 0), 0)
      
      const calculatedStats: ConversationStats = {
        total_conversations: processedConversations.length,
        active_conversations: activeCount,
        total_tokens_used: totalTokens,
        average_tokens_per_conversation: processedConversations.length > 0 
          ? Math.round(totalTokens / processedConversations.length) 
          : 0,
        total_cost_estimate: totalCost,
        average_cost_per_conversation: processedConversations.length > 0
          ? totalCost / processedConversations.length
          : 0,
        conversations_by_source: sourceCounts
      }
      
      setConversations(processedConversations)
      setStats(calculatedStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchConversations()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    fetchConversations()
  }
  
  // Calculate estimated cost based on token usage (GPT-4 pricing approximation)
  const calculateCost = (tokens: number): number => {
    const costPer1kTokens = 0.03 // $0.03 per 1K tokens (GPT-4 average)
    return (tokens / 1000) * costPer1kTokens
  }
  
  // Filter and sort conversations
  const filteredConversations = conversations
    .filter(conv => {
      if (searchTerm && !conv.user_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !conv.agent_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (statusFilter !== "all" && conv.status !== statusFilter) {
        return false
      }
      if (sourceFilter !== "all" && conv.source !== sourceFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
          break
        case "tokens":
          comparison = a.total_tokens - b.total_tokens
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })
  
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'web':
        return <Globe className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'embed':
        return <Code className="h-4 w-4" />
      case 'api':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'abandoned':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'handoff':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const formatTokenCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }
  
  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const duration = endDate.getTime() - startDate.getTime()
    const minutes = Math.floor(duration / 60000)
    
    if (minutes < 1) return "< 1 min"
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ${minutes % 60}m`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-50 text-blue-900 border-blue-200'
      case 'assistant':
        return 'bg-purple-50 text-purple-900 border-purple-200'
      case 'system':
        return 'bg-gray-50 text-gray-900 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-900 border-gray-200'
    }
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchConversations()
            }}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_conversations}</div>
              <div className="text-sm text-gray-500 mt-1">
                {stats.active_conversations} active
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                {formatTokenCount(stats.total_tokens_used)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Avg: {formatTokenCount(stats.average_tokens_per_conversation)}/conv
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 mr-1 text-green-600" />
                {stats.total_cost_estimate.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Avg: ${stats.average_cost_per_conversation.toFixed(3)}/conv
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Web Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.conversations_by_source.web || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Direct website chats
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Facebook Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.conversations_by_source.facebook || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Messenger integration
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Conversations</CardTitle>
              <CardDescription>View all conversations with token usage and cost estimates</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user ID or agent name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
                <SelectItem value="handoff">Handoff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="embed">Embed</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Split View Layout */}
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No conversations found</p>
            </div>
          ) : (
            <div className="flex gap-4 h-[600px]">
              {/* Left Panel - Conversation List */}
              <div className="w-1/3 border rounded-lg overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-medium text-sm">Conversations ({filteredConversations.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleConversationSelect(conv)}
                      className={cn(
                        "px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                        selectedConversation?.id === conv.id && "bg-blue-50 border-blue-200"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm font-medium">
                              {conv.user_id.substring(0, 12)}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Bot className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{conv.agent_name}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(conv.status))}>
                          {conv.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center">
                            {getSourceIcon(conv.source)}
                            <span className="ml-1 capitalize">{conv.source}</span>
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {conv.message_count}
                          </span>
                        </div>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(conv.started_at, conv.ended_at)}
                        </span>
                      </div>
                      {conv.last_message && (
                        <div className="mt-2 text-xs text-gray-600 truncate">
                          "{conv.last_message.substring(0, 50)}..."
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel - Conversation Details */}
              <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-sm flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            {selectedConversation.user_id}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                            <span className="flex items-center">
                              <Bot className="h-3 w-3 mr-1" />
                              {selectedConversation.agent_name}
                            </span>
                            <span className="flex items-center">
                              {getSourceIcon(selectedConversation.source)}
                              <span className="ml-1 capitalize">{selectedConversation.source}</span>
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDuration(selectedConversation.started_at, selectedConversation.ended_at)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(selectedConversation.status)}>
                          {selectedConversation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="flex items-center">
                          <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                          <span className="font-medium">{formatTokenCount(selectedConversation.total_tokens)}</span> tokens
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                          <span className="font-medium">${selectedConversation.total_cost?.toFixed(3) || '0.000'}</span>
                        </span>
                        <span className="flex items-center">
                          <Calculator className="h-3 w-3 mr-1 text-orange-500" />
                          <span className="font-medium">${selectedConversation.average_cost_per_message?.toFixed(4) || '0.0000'}</span>/msg
                        </span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                        selectedConversation.messages.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                              {msg.role === 'user' ? (
                                <User className="h-6 w-6 text-blue-600" />
                              ) : msg.role === 'assistant' ? (
                                <Bot className="h-6 w-6 text-purple-600" />
                              ) : (
                                <MessageSquare className="h-6 w-6 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-medium text-sm capitalize">{msg.role}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className={cn(
                                "rounded-lg px-3 py-2 text-sm border inline-block max-w-full",
                                getRoleColor(msg.role)
                              )}>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                {msg.total_tokens && (
                                  <div className="text-xs mt-2 opacity-60">
                                    Tokens: {msg.total_tokens} ({msg.prompt_tokens}p / {msg.completion_tokens}c)
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No messages in this conversation</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Select a conversation</p>
                      <p className="text-sm mt-1">Choose a conversation from the list to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}