// Authentication API types

import { IdentifiableEntity, TimestampedEntity, Role } from './common'

export interface User extends IdentifiableEntity, Partial<TimestampedEntity> {
  email: string
  name?: string
  role: Role
  isHumanAgent?: boolean
  humanAgentId?: string
  avatar_url?: string
  phone?: string
  metadata?: Record<string, unknown>
  organization_id?: string
  organizations?: Organization[]
}

export interface Organization extends IdentifiableEntity, TimestampedEntity {
  name: string
  slug?: string
  description?: string
  logo_url?: string
  settings?: OrganizationSettings
  subscription_tier?: 'free' | 'pro' | 'enterprise'
  member_count?: number
  agent_count?: number
}

export interface OrganizationSettings {
  default_language?: string
  timezone?: string
  business_hours?: BusinessHours
  features?: string[]
  limits?: {
    max_agents?: number
    max_members?: number
    max_conversations?: number
  }
}

export interface BusinessHours {
  enabled: boolean
  timezone: string
  schedule: {
    [key: string]: {
      start: string
      end: string
      enabled: boolean
    }
  }
}

export interface AuthSession {
  access_token: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  token_type?: string
  user?: User
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  name?: string
  organization_name?: string
}

export interface SignInResponse {
  session: AuthSession
  user: User
  message?: string
}

export interface SignUpResponse {
  session: AuthSession
  user: User
  message?: string
}

export interface GetUserProfileResponse {
  user: User
  organization?: Organization
}

export interface UpdateUserProfileRequest {
  name?: string
  avatar_url?: string
  phone?: string
  metadata?: Record<string, unknown>
}

export interface UpdateUserProfileResponse {
  user: User
  message: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ChangePasswordResponse {
  message: string
  success: boolean
}