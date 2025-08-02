// Lead API types

import { IdentifiableEntity, TimestampedEntity, PaginationParams, PaginationResponse } from './common'

export interface Lead extends IdentifiableEntity, TimestampedEntity {
  name: string
  email: string
  phone?: string
  company?: string
  source?: LeadSource
  classification: LeadClassification
  status: LeadStatus
  score?: number
  agent_id?: string
  agent_name?: string
  conversation_id?: string
  last_contacted?: string
  next_followup?: string
  notes?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  custom_fields?: Record<string, unknown>
  location?: {
    city?: string
    state?: string
    country?: string
    timezone?: string
  }
  engagement?: {
    email_opens?: number
    email_clicks?: number
    website_visits?: number
    last_activity?: string
  }
}

export type LeadSource = 
  | 'website' 
  | 'facebook' 
  | 'instagram' 
  | 'linkedin' 
  | 'twitter' 
  | 'google_ads' 
  | 'referral' 
  | 'manual' 
  | 'api' 
  | 'other'

export type LeadClassification = 
  | 'Hot' 
  | 'Warm' 
  | 'Cold' 
  | 'Priority' 
  | 'Nurturing'

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'proposal' 
  | 'negotiation' 
  | 'converted' 
  | 'lost' 
  | 'unqualified'

export interface GetLeadsRequest extends PaginationParams {
  classification?: LeadClassification
  status?: LeadStatus
  source?: LeadSource
  agent_id?: string
  search?: string
  date_from?: string
  date_to?: string
  score_min?: number
  score_max?: number
  has_conversation?: boolean
  sort_by?: 'created_at' | 'updated_at' | 'score' | 'last_contacted'
  sort_direction?: 'asc' | 'desc'
}

export interface GetLeadsResponse {
  leads: Lead[]
  pagination?: PaginationResponse
  total?: number
  statistics?: {
    total: number
    by_classification: Record<LeadClassification, number>
    by_status: Record<LeadStatus, number>
    average_score: number
  }
}

export interface GetLeadResponse {
  lead: Lead
}

export interface CreateLeadRequest {
  name: string
  email: string
  phone?: string
  company?: string
  source?: LeadSource
  classification?: LeadClassification
  notes?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export interface CreateLeadResponse {
  lead: Lead
  message: string
}

export interface UpdateLeadRequest {
  name?: string
  email?: string
  phone?: string
  company?: string
  classification?: LeadClassification
  status?: LeadStatus
  score?: number
  notes?: string
  next_followup?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  custom_fields?: Record<string, unknown>
}

export interface UpdateLeadResponse {
  lead: Lead
  message: string
}

export interface AssignLeadToAgentRequest {
  agent_id: string
  notes?: string
}

export interface AssignLeadToAgentResponse {
  lead: Lead
  message: string
}

export interface ConvertLeadRequest {
  opportunity_name?: string
  deal_value?: number
  expected_close_date?: string
  notes?: string
}

export interface ConvertLeadResponse {
  lead: Lead
  opportunity?: {
    id: string
    name: string
    value: number
    expected_close_date: string
  }
  message: string
}

export interface DeleteLeadResponse {
  message: string
  success: boolean
}

export interface BulkLeadOperation {
  lead_ids: string[]
  operation: 'assign' | 'update_classification' | 'update_status' | 'delete' | 'tag'
  data?: {
    agent_id?: string
    classification?: LeadClassification
    status?: LeadStatus
    tags?: string[]
  }
}

export interface BulkLeadOperationResponse {
  successful: string[]
  failed: Array<{
    lead_id: string
    error: string
  }>
  message: string
}