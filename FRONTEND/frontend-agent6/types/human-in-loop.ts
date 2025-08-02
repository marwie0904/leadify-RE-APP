// Human in the Loop TypeScript interfaces
// Extends existing Message and Conversation interfaces for handoff functionality

// Existing base interfaces - extended for Human in the Loop
export interface Message {
  id: string
  content: string
  sender: string // 'user', 'ai', 'human_agent'
  timestamp: string
  human_agent_id?: string // Added for human agent messages
  agent_name?: string // Added to show which human agent sent the message
}

export interface Conversation {
  id: string
  title: string
  leadName: string
  user_name?: string // Alternative field name from API
  lastMessage: string
  lastMessageAt: string
  last_message_at?: string // Alternative field name from API
  source?: string // 'facebook', 'website', etc.
  mode: ConversationMode // Extended to include handoff states
  priority: HandoffPriority
  assigned_human_agent_id?: string | null
  created_at?: string
  agents?: {
    name: string
    organization_id: string
  }
  human_agents?: {
    id: string
    name: string
  } | null
  hasHandoffRequest?: boolean
  handoffPriority?: HandoffPriority
  handoffRequestedAt?: string
}

// Conversation modes
export type ConversationMode = 
  | 'ai' 
  | 'handoff_requested' 
  | 'human'

// Handoff priorities
export type HandoffPriority = 1 | 2 | 3 // 1=normal, 2=high, 3=urgent

export interface HandoffRequest {
  id: string
  conversation_id: string
  requested_by: string
  reason?: string
  priority: HandoffPriority
  status: HandoffStatus
  created_at: string
  requested_at?: string // Alternative field name
  conversations?: Conversation // Related conversation data
}

export type HandoffStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'cancelled'

export interface HumanAgent {
  id: string
  name: string
  email?: string
  status?: HumanAgentStatus
  user_id?: string
}

export type HumanAgentStatus = 
  | 'available' 
  | 'busy' 
  | 'offline'

// Dashboard data structures
export interface HumanAgentDashboard {
  agent: HumanAgent
  pendingHandoffs: HandoffRequest[]
  assignedConversations: Conversation[]
  stats: {
    pendingCount: number
    assignedCount: number
  }
}

export interface PriorityQueueResponse {
  conversations: Conversation[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

// API request/response types
export interface HandoffRequestPayload {
  reason?: string
  priority?: HandoffPriority
  requested_by?: string
}

export interface HandoffAcceptPayload {
  notes?: string
}

export interface HandoffRequestResponse {
  handoff: HandoffRequest
  message: string
}

export interface HandoffAcceptResponse {
  message: string
  agent: {
    id: string
    name: string
  }
}

export interface SendMessagePayload {
  message: string
}

export interface SendMessageResponse {
  message: string
  messageId: string
  sentAt: string
}

// UI Component Props
export interface HandoffButtonProps {
  conversationId: string
  disabled?: boolean
  onHandoffRequested?: () => void
}

export interface ConversationModeIndicatorProps {
  mode: ConversationMode
  humanAgentName?: string
  loading?: boolean
}

export interface PendingHandoffProps {
  handoff: HandoffRequest
  onAccept: (handoffId: string, notes?: string) => Promise<void>
  loading?: boolean
}

export interface AssignedConversationProps {
  conversation: Conversation
  onOpenChat: (conversationId: string) => void
  unreadCount?: number
}

// Extended Message for streaming
export interface StreamingMessage extends Message {
  isStreaming?: boolean
  streamingComplete?: boolean
}

// Error types
export interface HandoffError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Notification types
export interface HandoffNotification {
  type: 'handoff_requested' | 'handoff_accepted' | 'new_message' | 'conversation_assigned'
  data: {
    conversationId: string
    handoffId?: string
    agentName?: string
    message?: string
    priority?: HandoffPriority
  }
  timestamp: string
}

// Filter and sorting options
export interface PriorityQueueFilters {
  mode?: ConversationMode
  priority?: HandoffPriority
  assignedAgent?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface SortOptions {
  field: 'priority' | 'created_at' | 'last_message_at'
  direction: 'asc' | 'desc'
}

// Statistics and analytics
export interface HandoffStats {
  totalHandoffs: number
  pendingHandoffs: number
  averageResponseTime: number
  handoffsByPriority: Record<HandoffPriority, number>
  handoffsByAgent: Record<string, number>
}

// Extended auth context types
export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  isHumanAgent?: boolean
  humanAgentId?: string
}

export type UserRole = 
  | 'user' 
  | 'admin' 
  | 'human_agent'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  getAuthHeaders: () => Promise<Record<string, string>>
  isHumanAgent: boolean
  canAccessHumanDashboard: boolean
}