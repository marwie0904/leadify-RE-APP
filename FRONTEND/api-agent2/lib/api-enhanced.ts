import { z } from 'zod'
import * as schemas from './validation/schemas'
import { migrationRequestInterceptor } from './api/migration-helper'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// Request queue and deduplication
interface QueuedRequest {
  id: string
  endpoint: string
  options: ApiOptions
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
  retryCount: number
}

interface ApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
  skipValidation?: boolean
  maxRetries?: number
  retryDelay?: number
  dedupe?: boolean
  schema?: z.ZodType<any>
}

// Request interceptor type
type RequestInterceptor = (endpoint: string, options: ApiOptions) => Promise<[string, ApiOptions]>
// Response interceptor type
type ResponseInterceptor = (response: Response, data: any) => Promise<any>

class ApiClient {
  private requestQueue: Map<string, QueuedRequest> = new Map()
  private activeRequests: Map<string, Promise<any>> = new Map()
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  
  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }
  
  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }
  
  // Generate request key for deduplication
  private getRequestKey(endpoint: string, options: ApiOptions): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${endpoint}:${body}`
  }
  
  // Exponential backoff calculation
  private getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, retryCount) + Math.random() * 1000, 30000)
  }
  
  // Check if error is retryable
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch failed') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      )
    }
    return false
  }
  
  // Execute request with retries
  private async executeRequest(
    endpoint: string,
    options: ApiOptions,
    retryCount: number = 0
  ): Promise<any> {
    const maxRetries = options.maxRetries ?? 3
    const baseRetryDelay = options.retryDelay ?? 1000
    
    try {
      // Apply request interceptors
      let interceptedEndpoint = endpoint
      let interceptedOptions = { ...options }
      
      for (const interceptor of this.requestInterceptors) {
        [interceptedEndpoint, interceptedOptions] = await interceptor(interceptedEndpoint, interceptedOptions)
      }
      
      const url = `${API_BASE_URL}${interceptedEndpoint}`
      console.log(`[API] Request: ${interceptedOptions.method || 'GET'} ${url}`, {
        headers: interceptedOptions.headers,
        retryCount,
        timestamp: new Date().toISOString()
      })
      
      const config: RequestInit = {
        method: interceptedOptions.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...interceptedOptions.headers,
        },
        signal: interceptedOptions.signal,
      }
      
      if (interceptedOptions.body && interceptedOptions.method !== "GET") {
        if (interceptedOptions.body instanceof FormData) {
          const headers = config.headers as Record<string, string>
          delete headers["Content-Type"]
          config.headers = headers
          config.body = interceptedOptions.body
        } else {
          config.body = JSON.stringify(interceptedOptions.body)
        }
      }
      
      const response = await fetch(url, config)
      console.log(`[API] Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
        
        // Check if we should retry
        if (retryCount < maxRetries && (response.status >= 500 || this.isRetryableError(error))) {
          const delay = this.getRetryDelay(retryCount, baseRetryDelay)
          console.log(`[API] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
          
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.executeRequest(endpoint, options, retryCount + 1)
        }
        
        throw error
      }
      
      let data = await response.json()
      
      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        data = await interceptor(response, data)
      }
      
      // Validate response if schema provided
      if (options.schema && !options.skipValidation) {
        try {
          data = schemas.validateApiResponse(options.schema, data)
          console.log(`[API] Response validation passed for ${endpoint}`)
        } catch (validationError) {
          console.error(`[API] Response validation failed for ${endpoint}:`, validationError)
          throw new Error(`Invalid API response format: ${validationError}`)
        }
      }
      
      return data
    } catch (error) {
      // Retry on network errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        const delay = this.getRetryDelay(retryCount, baseRetryDelay)
        console.log(`[API] Retrying request due to error in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeRequest(endpoint, options, retryCount + 1)
      }
      
      console.error(`[API] Request failed for ${endpoint}:`, error)
      throw error
    }
  }
  
  // Main API call method with deduplication
  async call(endpoint: string, options: ApiOptions = {}): Promise<any> {
    // Check if deduplication is enabled (default: true for GET requests)
    const shouldDedupe = options.dedupe ?? (options.method === 'GET' || !options.method)
    
    if (shouldDedupe) {
      const requestKey = this.getRequestKey(endpoint, options)
      
      // Check if there's already an active request
      const activeRequest = this.activeRequests.get(requestKey)
      if (activeRequest) {
        console.log(`[API] Deduplicating request: ${requestKey}`)
        return activeRequest
      }
      
      // Create and store the promise
      const requestPromise = this.executeRequest(endpoint, options).finally(() => {
        // Clean up after request completes
        this.activeRequests.delete(requestKey)
      })
      
      this.activeRequests.set(requestKey, requestPromise)
      return requestPromise
    }
    
    // If not deduping, just execute normally
    return this.executeRequest(endpoint, options)
  }
}

// Create singleton instance
const apiClient = new ApiClient()

// Export enhanced API call function for backward compatibility
export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  return apiClient.call(endpoint, options)
}

// Export typed API methods
export const api = {
  // User & Auth
  async getProfile(headers: Record<string, string>) {
    return apiCall('/api/settings/profile', {
      headers,
      schema: schemas.profileResponseSchema,
    })
  },
  
  // Organization
  async getOrganizationMembers(headers: Record<string, string>) {
    return apiCall('/api/organization/members', {
      headers,
      schema: schemas.organizationMembersResponseSchema,
    })
  },
  
  // Agents
  async getAgents(headers: Record<string, string>) {
    return apiCall('/api/agents', {
      headers,
      schema: schemas.agentsListResponseSchema,
    })
  },
  
  async createAgent(data: any, headers: Record<string, string>) {
    return apiCall('/api/agents/create', {
      method: 'POST',
      headers,
      body: data,
      schema: schemas.agentSchema,
    })
  },
  
  // Leads
  async getLeads(headers: Record<string, string>, params?: { assignedAgentId?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.assignedAgentId) {
      queryParams.append('assignedAgentId', params.assignedAgentId)
    }
    const endpoint = queryParams.toString() 
      ? `/api/leads?${queryParams.toString()}`
      : '/api/leads'
      
    return apiCall(endpoint, {
      headers,
      schema: schemas.leadsListResponseSchema,
    })
  },
  
  async assignAgentToLead(leadId: string, agentId: string, headers: Record<string, string>) {
    return apiCall(`/api/leads/${leadId}/assign-agent`, {
      method: 'PATCH',
      headers,
      body: { agentId },
      schema: schemas.successResponseSchema,
    })
  },
  
  // Conversations
  async getConversations(headers: Record<string, string>) {
    return apiCall('/api/conversations', {
      headers,
      schema: schemas.conversationsListResponseSchema,
    })
  },
  
  async getConversationMessages(conversationId: string, headers: Record<string, string>) {
    return apiCall(`/api/conversations/${conversationId}/messages`, {
      headers,
      schema: schemas.messagesResponseSchema,
    })
  },
  
  // Chat
  async sendChatMessage(data: any, headers: Record<string, string>) {
    return apiCall('/api/chat', {
      method: 'POST',
      headers,
      body: data,
      schema: schemas.chatResponseSchema,
      dedupe: false, // Don't dedupe POST requests
    })
  },
  
  // Dashboard
  async getDashboardSummary(headers: Record<string, string>) {
    return apiCall('/api/dashboard/summary', {
      headers,
      schema: schemas.dashboardSummarySchema,
    })
  },
  
  // Human-in-loop
  async requestHandoff(
    conversationId: string,
    payload: schemas.z.infer<typeof schemas.handoffRequestSchema>,
    headers: Record<string, string>
  ) {
    return apiCall(`/api/conversations/${conversationId}/request-handoff`, {
      method: 'POST',
      headers,
      body: payload,
    })
  },
  
  async acceptHandoff(
    conversationId: string,
    payload: { notes?: string },
    headers: Record<string, string>
  ) {
    return apiCall(`/api/conversations/${conversationId}/accept-handoff`, {
      method: 'POST',
      headers,
      body: payload,
    })
  },
  
  async getHumanAgentDashboard(headers: Record<string, string>) {
    return apiCall('/api/human-agents/dashboard', {
      headers,
      schema: schemas.humanAgentDashboardSchema,
    })
  },
  
  async getPriorityQueue(
    headers: Record<string, string>,
    params: { limit?: number; offset?: number; mode?: string } = {}
  ) {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    if (params.mode) queryParams.append('mode', params.mode)
    
    const endpoint = queryParams.toString()
      ? `/api/conversations/priority-queue?${queryParams.toString()}`
      : '/api/conversations/priority-queue'
      
    return apiCall(endpoint, {
      headers,
      schema: schemas.priorityQueueResponseSchema,
    })
  },
  
  async sendHumanAgentMessage(
    conversationId: string,
    payload: { message: string },
    headers: Record<string, string>
  ) {
    return apiCall(`/api/conversations/${conversationId}/send-message`, {
      method: 'POST',
      headers,
      body: payload,
      dedupe: false,
    })
  },
  
  // File upload
  async uploadFile(endpoint: string, formData: FormData, headers: Record<string, string> = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    console.log(`[API] Uploading file to: ${url}`)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: formData,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Validate if schema provided
      if (schemas.fileUploadResponseSchema) {
        return schemas.validateApiResponse(schemas.fileUploadResponseSchema, data)
      }
      
      return data
    } catch (error) {
      console.error(`[API] File upload failed for ${endpoint}:`, error)
      throw error
    }
  },
}

// Add default interceptors
// 1. Migration interceptor (first - handles endpoint migration)
apiClient.addRequestInterceptor(migrationRequestInterceptor)

// 2. Logging interceptor (second - logs the migrated endpoints)
apiClient.addRequestInterceptor(async (endpoint, options) => {
  // Log all requests
  console.log(`[API Interceptor] Request: ${options.method || 'GET'} ${endpoint}`)
  return [endpoint, options]
})

apiClient.addResponseInterceptor(async (response, data) => {
  // Log all responses
  console.log(`[API Interceptor] Response:`, { status: response.status, data })
  return data
})

// Export for testing and advanced usage
export { apiClient, ApiClient, type ApiOptions }

// Re-export uploadFile for backward compatibility
export { api as uploadFile }