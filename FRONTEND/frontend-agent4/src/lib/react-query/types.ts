// Domain types for API responses
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  organization_id: string
  role: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  channel: 'webchat' | 'email' | 'sms' | 'facebook' | 'whatsapp'
  status: 'active' | 'resolved' | 'pending'
  priority: 'low' | 'medium' | 'high'
  last_message: string
  last_message_at: string
  unread_count: number
  agent_id?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_name: string
  content: string
  attachments?: string[]
  created_at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  classification: 'Hot' | 'Warm' | 'Cold' | 'Priority'
  score: number
  notes?: string
  agent_id?: string
  created_at: string
  updated_at: string
}

export interface Analytics {
  totalLeads: number
  convertedLeads: number
  conversionRate: string
  averageResponseTime: string
  customerSatisfaction: number
  activeConversations: number
  resolvedConversations: number
  leadsByDate: Array<{
    date: string
    leads: number
  }>
  conversationsByChannel: Array<{
    channel: string
    count: number
  }>
  agentPerformance: Array<{
    agent_id: string
    agent_name: string
    conversations_handled: number
    average_response_time: string
    satisfaction_score: number
  }>
}

export interface Agent {
  id: string
  name: string
  tone: 'Professional' | 'Friendly' | 'Neutral'
  language: 'English' | 'Tagalog'
  status: 'creating' | 'ready' | 'error'
  openingMessage?: string
  knowledgeBase?: string
  responseGuidelines?: string
  user_id: string
  organization_id: string
  created_at: string
  updated_at: string
}

// API Error type
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Filter types
export interface ConversationFilters {
  status?: Conversation['status']
  channel?: Conversation['channel']
  priority?: Conversation['priority']
  agent_id?: string
  date_from?: string
  date_to?: string
}

export interface LeadFilters {
  status?: Lead['status']
  classification?: Lead['classification']
  source?: string
  agent_id?: string
  score_min?: number
  score_max?: number
  date_from?: string
  date_to?: string
}