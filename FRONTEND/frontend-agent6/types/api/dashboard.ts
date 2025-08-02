// Dashboard API types

import { DateRangeFilter } from './common'

export interface DashboardSummary {
  totalConversations: number
  activeConversations: number
  convertedLeads: number
  satisfactionRate: number
  responseTime: number
  conversionRate: number
  period?: {
    start: string
    end: string
  }
  comparison?: {
    totalConversations: PercentageChange
    activeConversations: PercentageChange
    convertedLeads: PercentageChange
    satisfactionRate: PercentageChange
    responseTime: PercentageChange
    conversionRate: PercentageChange
  }
}

export interface PercentageChange {
  value: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

export interface ConversationMetrics {
  date: string
  count: number
  successful: number
  failed: number
  average_duration?: number
  average_messages?: number
}

export interface LeadMetrics {
  date: string
  total: number
  converted: number
  hot: number
  warm: number
  cold: number
  conversion_rate: number
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  total_conversations: number
  successful_conversations: number
  average_rating?: number
  average_response_time?: number
  conversion_rate: number
  satisfaction_rate?: number
}

export interface GetDashboardSummaryRequest extends DateRangeFilter {
  agent_id?: string
  compare_with_previous?: boolean
}

export interface GetDashboardSummaryResponse {
  summary: DashboardSummary
  charts?: {
    conversations: ConversationMetrics[]
    leads: LeadMetrics[]
    agents: AgentPerformance[]
  }
}

export interface GetConversationMetricsRequest extends DateRangeFilter {
  agent_id?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface GetConversationMetricsResponse {
  metrics: ConversationMetrics[]
  total: {
    conversations: number
    successful: number
    failed: number
  }
}

export interface GetLeadMetricsRequest extends DateRangeFilter {
  agent_id?: string
  source?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface GetLeadMetricsResponse {
  metrics: LeadMetrics[]
  total: {
    leads: number
    converted: number
    conversion_rate: number
  }
}

export interface GetAgentPerformanceRequest extends DateRangeFilter {
  agent_ids?: string[]
  sort_by?: 'conversations' | 'conversion_rate' | 'satisfaction_rate'
  sort_direction?: 'asc' | 'desc'
}

export interface GetAgentPerformanceResponse {
  agents: AgentPerformance[]
  summary: {
    total_agents: number
    average_conversion_rate: number
    average_satisfaction_rate: number
  }
}