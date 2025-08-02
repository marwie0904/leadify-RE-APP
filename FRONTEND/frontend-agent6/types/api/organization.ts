// Organization API types

import { IdentifiableEntity, TimestampedEntity, Role } from './common'
import { User, Organization } from './auth'
import { Agent } from './agents'

export interface OrganizationMember extends IdentifiableEntity, TimestampedEntity {
  user_id: string
  organization_id: string
  role: Role
  status: 'active' | 'inactive' | 'pending'
  invited_by?: string
  invited_at?: string
  accepted_at?: string
  permissions?: string[]
  user?: Partial<User>
  name?: string
  email?: string
}

export interface GetOrganizationResponse {
  organization: Organization
  members?: OrganizationMember[]
  agents?: Agent[]
}

export interface GetOrganizationMembersRequest {
  role?: Role
  status?: 'active' | 'inactive' | 'pending'
  search?: string
}

export interface GetOrganizationMembersResponse {
  members: OrganizationMember[]
  total?: number
}

export interface InviteMemberRequest {
  email: string
  role: Role
  permissions?: string[]
  send_email?: boolean
}

export interface InviteMemberResponse {
  member: OrganizationMember
  invitation_link?: string
  message: string
}

export interface UpdateMemberRequest {
  role?: Role
  permissions?: string[]
  status?: 'active' | 'inactive'
}

export interface UpdateMemberResponse {
  member: OrganizationMember
  message: string
}

export interface RemoveMemberResponse {
  message: string
  success: boolean
}

export interface GetOrganizationAgentsResponse {
  agents: Agent[]
  total?: number
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
  logo_url?: string
  settings?: {
    default_language?: string
    timezone?: string
    business_hours?: {
      enabled: boolean
      schedule: Record<string, { start: string; end: string; enabled: boolean }>
    }
  }
}

export interface UpdateOrganizationResponse {
  organization: Organization
  message: string
}

export interface OrganizationUsageStats {
  period: {
    start: string
    end: string
  }
  conversations: {
    total: number
    ai_handled: number
    human_handled: number
  }
  messages: {
    total: number
    ai_generated: number
    human_sent: number
  }
  leads: {
    total: number
    converted: number
    conversion_rate: number
  }
  agents: {
    total: number
    active: number
  }
  members: {
    total: number
    active: number
  }
  storage: {
    used_bytes: number
    limit_bytes: number
    percentage: number
  }
}

export interface GetOrganizationUsageRequest {
  start_date?: string
  end_date?: string
}

export interface GetOrganizationUsageResponse {
  usage: OrganizationUsageStats
}

export interface OrganizationBillingInfo {
  subscription_tier: 'free' | 'pro' | 'enterprise'
  billing_cycle: 'monthly' | 'yearly'
  current_period: {
    start: string
    end: string
  }
  amount: number
  currency: string
  payment_method?: {
    type: 'card' | 'invoice'
    last4?: string
    brand?: string
  }
  next_billing_date?: string
  usage_limits: {
    conversations: number
    messages: number
    storage_gb: number
    agents: number
    members: number
  }
}

export interface GetOrganizationBillingResponse {
  billing: OrganizationBillingInfo
}