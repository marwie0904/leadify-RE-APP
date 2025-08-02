// Chat API types

import { IdentifiableEntity, TimestampedEntity } from './common'
import { Message } from '../human-in-loop'

export interface ChatRequest {
  message: string
  conversation_id?: string
  agent_id?: string
  lead_id?: string
  context?: ChatContext
  stream?: boolean
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface ChatContext {
  user_info?: {
    name?: string
    email?: string
    location?: string
    preferences?: Record<string, unknown>
  }
  conversation_history?: Message[]
  metadata?: Record<string, unknown>
}

export interface ChatResponse {
  message: ChatMessage
  conversation_id?: string
  agent_id?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
}

export interface ChatMessage extends Message {
  role?: 'user' | 'assistant' | 'system'
  metadata?: Record<string, unknown>
  tokens?: number
}

export interface StreamingChatResponse {
  id: string
  type: 'start' | 'chunk' | 'end' | 'error'
  content?: string
  error?: string
  metadata?: Record<string, unknown>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatSession extends IdentifiableEntity, TimestampedEntity {
  conversation_id: string
  agent_id: string
  lead_id?: string
  messages: ChatMessage[]
  status: 'active' | 'completed' | 'error'
  metadata?: Record<string, unknown>
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  topics?: string[]
  total_tokens?: number
}

export interface GetChatSessionRequest {
  session_id?: string
  conversation_id?: string
}

export interface GetChatSessionResponse {
  session: ChatSession
}

export interface GetChatHistoryRequest {
  conversation_id: string
  limit?: number
  before?: string
  after?: string
}

export interface GetChatHistoryResponse {
  messages: ChatMessage[]
  has_more: boolean
  total?: number
}

export interface GenerateChatSummaryRequest {
  conversation_id: string
  message_count?: number
}

export interface GenerateChatSummaryResponse {
  summary: string
  key_points: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  topics: string[]
  action_items?: string[]
}

export interface ChatFeedback {
  message_id: string
  rating?: 1 | 2 | 3 | 4 | 5
  feedback?: string
  helpful?: boolean
}

export interface SubmitChatFeedbackResponse {
  message: string
  success: boolean
}

export interface ChatSuggestion {
  text: string
  type: 'question' | 'action' | 'information'
  confidence: number
}

export interface GetChatSuggestionsRequest {
  conversation_id: string
  context?: ChatContext
}

export interface GetChatSuggestionsResponse {
  suggestions: ChatSuggestion[]
}

export interface ChatAnalytics {
  conversation_id: string
  metrics: {
    message_count: number
    average_response_time: number
    sentiment_score: number
    engagement_score: number
    resolution_status: 'resolved' | 'ongoing' | 'escalated'
  }
  timeline: Array<{
    timestamp: string
    event: 'message_sent' | 'message_received' | 'agent_changed' | 'handoff_requested'
    details?: Record<string, unknown>
  }>
}

export interface GetChatAnalyticsRequest {
  conversation_id: string
}

export interface GetChatAnalyticsResponse {
  analytics: ChatAnalytics
}