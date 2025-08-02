// Agent API types

import { IdentifiableEntity, TimestampedEntity } from './common'

export interface Agent extends IdentifiableEntity, TimestampedEntity {
  name: string
  description?: string
  status?: 'active' | 'inactive'
  organization_id: string
  greeting?: string
  prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  tools?: string[]
  metadata?: Record<string, unknown>
  is_default?: boolean
  categories?: string[]
  tags?: string[]
}

export interface CreateAgentRequest {
  name: string
  description?: string
  greeting?: string
  prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  tools?: string[]
  metadata?: Record<string, unknown>
  is_default?: boolean
  categories?: string[]
  tags?: string[]
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

export interface AgentDocument extends IdentifiableEntity, TimestampedEntity {
  agent_id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  category?: 'knowledge' | 'estimation' | 'conversation_reference'
  status?: 'processing' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
  error?: string
}

export interface UploadDocumentResponse {
  document?: AgentDocument
  documents?: AgentDocument[]
  message: string
  error?: string
}

export interface ConversationReferenceImage extends IdentifiableEntity, TimestampedEntity {
  agent_id: string
  file_name: string
  file_url: string
  file_size: number
  category: 'conversation_reference'
  display_order?: number
  alt_text?: string
}

export interface UploadImagesResponse {
  successful: ConversationReferenceImage[]
  failed: Array<{
    file_name: string
    error: string
  }>
  message: string
}

// Response types
export interface GetAgentsResponse {
  agents: Agent[]
  total?: number
}

export interface GetAgentResponse {
  agent: Agent
}

export interface CreateAgentResponse {
  agent: Agent
  message: string
}

export interface UpdateAgentResponse {
  agent: Agent
  message: string
}

export interface DeleteAgentResponse {
  message: string
  success: boolean
}

export interface GetAgentDocumentsResponse {
  documents: AgentDocument[]
  total?: number
}

export interface GetConversationReferenceImagesResponse {
  images: ConversationReferenceImage[]
  total?: number
}