// Conversation API types

import { IdentifiableEntity, TimestampedEntity, PaginationParams, PaginationResponse } from './common'
import { Agent } from './agents'
import { ConversationMode, HandoffPriority, Message } from '../human-in-loop'

export interface Conversation extends IdentifiableEntity, TimestampedEntity {
  title: string
  leadName: string
  user_name?: string
  lastMessage: string
  lastMessageAt: string
  last_message_at?: string
  source?: ConversationSource
  mode: ConversationMode
  priority: HandoffPriority
  assigned_human_agent_id?: string | null
  agent_id?: string
  lead_id?: string
  status?: ConversationStatus
  unread_count?: number
  metadata?: Record<string, unknown>
  agents?: Partial<Agent>
  human_agents?: {
    id: string
    name: string
    email?: string
  } | null
  hasHandoffRequest?: boolean
  handoffPriority?: HandoffPriority
  handoffRequestedAt?: string
  tags?: string[]
}

export type ConversationSource = 
  | 'website' 
  | 'facebook' 
  | 'whatsapp' 
  | 'instagram' 
  | 'twitter' 
  | 'email' 
  | 'api' 
  | 'manual'

export type ConversationStatus = 
  | 'active' 
  | 'archived' 
  | 'resolved' 
  | 'pending' 
  | 'escalated'

export interface GetConversationsRequest extends PaginationParams {
  mode?: ConversationMode
  status?: ConversationStatus
  source?: ConversationSource
  agent_id?: string
  lead_id?: string
  assigned_human_agent_id?: string
  search?: string
  date_from?: string
  date_to?: string
  sort_by?: 'created_at' | 'last_message_at' | 'priority'
  sort_direction?: 'asc' | 'desc'
}

export interface GetConversationsResponse {
  conversations: Conversation[]
  pagination?: PaginationResponse
  total?: number
}

export interface GetConversationResponse {
  conversation: Conversation
}

export interface CreateConversationRequest {
  lead_id?: string
  agent_id?: string
  title?: string
  source?: ConversationSource
  initial_message?: string
  metadata?: Record<string, unknown>
}

export interface CreateConversationResponse {
  conversation: Conversation
  message: string
}

export interface UpdateConversationRequest {
  title?: string
  status?: ConversationStatus
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateConversationResponse {
  conversation: Conversation
  message: string
}

export interface GetConversationMessagesRequest extends PaginationParams {
  before?: string
  after?: string
}

export interface GetConversationMessagesResponse {
  messages: Message[]
  conversation?: Conversation
  pagination?: PaginationResponse
  hasHumanMessages?: boolean
  total?: number
}

export interface SendMessageRequest {
  message: string
  sender?: 'user' | 'ai' | 'human_agent'
  metadata?: Record<string, unknown>
}

export interface SendMessageResponse {
  message: Message
  conversation?: Conversation
}

export interface TransferToAIRequest {
  reason?: string
  notes?: string
}

export interface TransferToAIResponse {
  conversation: Conversation
  message: string
}

export interface ArchiveConversationResponse {
  conversation: Conversation
  message: string
}

export interface DeleteConversationResponse {
  message: string
  success: boolean
}