/**
 * Simple API Client - Replaces over-engineered api-enhanced.ts
 * Basic fetch wrapper with auth headers and minimal error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// Simple error class
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly endpoint?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Basic API options
interface ApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

// Simple API client with basic functionality
class SimpleApiClient {
  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const { method = 'GET', headers = {}, body } = options

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      ...headers,
    }
    
    // Check if body is FormData
    const isFormData = body instanceof FormData
    
    // Only set Content-Type for non-FormData requests
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json'
    }

    // Prepare request body
    const requestBody = isFormData ? body : (body ? JSON.stringify(body) : undefined)

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
      })

      // Parse response
      let data: any
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Handle errors
      if (!response.ok) {
        throw new ApiError(
          response.status,
          data?.message || data || `HTTP ${response.status}`,
          endpoint
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      // Network or other errors
      throw new ApiError(0, error instanceof Error ? error.message : 'Network error', endpoint)
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers })
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers })
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers })
  }

  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers })
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers })
  }
}

// Export singleton instance
export const apiClient = new SimpleApiClient()

// Simple API function for backward compatibility
export async function apiCall<T>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<T> {
  return apiClient.request<T>(endpoint, options)
}

// Simple API object for compatibility with existing code
export const api = {
  // Auth endpoints
  async getProfile(headers: Record<string, string>) {
    return apiClient.get('/api/settings/profile', headers)
  },

  async updateProfile(data: any, headers: Record<string, string>) {
    return apiClient.put('/api/settings/profile', data, headers)
  },

  // Agent endpoints
  async getAgents(headers: Record<string, string>) {
    return apiClient.get('/api/agents', headers)
  },

  async createAgent(data: any, headers: Record<string, string>) {
    return apiClient.post('/api/agents', data, headers)
  },

  async updateAgent(id: string, data: any, headers: Record<string, string>) {
    return apiClient.put(`/api/agents/${id}`, data, headers)
  },

  async deleteAgent(id: string, headers: Record<string, string>) {
    return apiClient.delete(`/api/agents/${id}`, headers)
  },

  // Lead endpoints
  async getLeads(headers: Record<string, string>, params?: string) {
    const endpoint = params ? `/api/leads?${params}` : '/api/leads'
    return apiClient.get(endpoint, headers)
  },

  async createLead(data: any, headers: Record<string, string>) {
    return apiClient.post('/api/leads', data, headers)
  },

  async updateLead(id: string, data: any, headers: Record<string, string>) {
    return apiClient.put(`/api/leads/${id}`, data, headers)
  },

  // Conversation endpoints
  async getConversations(headers: Record<string, string>) {
    return apiClient.get('/api/conversations', headers)
  },

  async getConversationMessages(conversationId: string, headers: Record<string, string>) {
    return apiClient.get(`/api/conversations/${conversationId}/messages`, headers)
  },

  async sendMessage(conversationId: string, data: any, headers: Record<string, string>) {
    return apiClient.post(`/api/conversations/${conversationId}/messages`, data, headers)
  },

  // Organization endpoints
  async getOrganizations(headers: Record<string, string>) {
    return apiClient.get('/api/organizations', headers)
  },

  async createOrganization(data: any, headers: Record<string, string>) {
    return apiClient.post('/api/organizations', data, headers)
  },

  async getOrganizationMembers(headers: Record<string, string>) {
    return apiClient.get('/api/organization/members', headers)
  },

  async inviteToOrganization(data: any, headers: Record<string, string>) {
    return apiClient.post('/api/organization/invite', data, headers)
  },

  // Human-in-loop endpoints
  async requestHandoff(conversationId: string, data: any, headers: Record<string, string>) {
    return apiClient.post(`/api/conversations/${conversationId}/request-handoff`, data, headers)
  },

  async acceptHandoff(conversationId: string, data: any, headers: Record<string, string>) {
    return apiClient.post(`/api/conversations/${conversationId}/accept-handoff`, data, headers)
  },

  async getHumanAgentDashboard(headers: Record<string, string>) {
    return apiClient.get('/api/human-agents/dashboard', headers)
  },

  async getPriorityQueue(headers: Record<string, string>, params: any = {}) {
    const queryString = new URLSearchParams(params).toString()
    const endpoint = queryString ? `/api/conversations/priority-queue?${queryString}` : '/api/conversations/priority-queue'
    return apiClient.get(endpoint, headers)
  },

  async sendHumanAgentMessage(conversationId: string, data: any, headers: Record<string, string>) {
    return apiClient.post(`/api/conversations/${conversationId}/send-message`, data, headers)
  },

  // Analytics endpoints
  async getAnalytics(headers: Record<string, string>) {
    return apiClient.get('/api/analytics', headers)
  },

  async getDashboardStats(headers: Record<string, string>) {
    return apiClient.get('/api/dashboard/stats', headers)
  },
}