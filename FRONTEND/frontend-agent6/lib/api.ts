const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

import { ApiRequestBody, ApiHeaders } from '@/types/api'

interface ApiOptions {
  method?: string
  headers?: ApiHeaders
  body?: ApiRequestBody
  signal?: AbortSignal
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  console.log(`API Call: ${endpoint}`, { options, API_BASE_URL })

  try {
    const url = `${API_BASE_URL}${endpoint}`
    console.log(`Making API call to: ${url}`)
    console.log(`Headers:`, options.headers)

    const config: RequestInit = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: options.signal,
    }

    if (options.body && options.method !== "GET") {
      if (options.body instanceof FormData) {
        // Remove Content-Type for FormData to let browser set it with boundary
        const headers = config.headers as Record<string, string>
        delete headers["Content-Type"];
        config.headers = headers;
        config.body = options.body
      } else {
        config.body = JSON.stringify(options.body)
      }
    }

    const response = await fetch(url, config)
    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error Response:`, errorText)
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`API response for ${endpoint}:`, data)
    return data
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

export async function uploadFile(endpoint: string, formData: FormData, headers: ApiHeaders = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`
    console.log(`Uploading file to: ${url}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error(`File upload failed for ${endpoint}:`, error)
    throw error
  }
}

// Human in the Loop API Functions
import type {
  HandoffRequestPayload,
  HandoffRequestResponse,
  HandoffAcceptPayload,
  HandoffAcceptResponse,
  HumanAgentDashboard,
  PriorityQueueResponse,
  SendMessagePayload,
  SendMessageResponse,
  Conversation,
  Message,
} from "@/types/human-in-loop"

/**
 * Request handoff to human agent
 */
export async function requestHandoff(
  conversationId: string,
  payload: HandoffRequestPayload,
  headers: Record<string, string>
): Promise<HandoffRequestResponse> {
  console.log(`[Human in Loop] Requesting handoff for conversation: ${conversationId}`, {
    payload,
    endpoint: `/api/conversations/${conversationId}/request-handoff`,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall(`/api/conversations/${conversationId}/request-handoff`, {
      method: "POST",
      headers,
      body: payload,
    })

    console.log(`[Human in Loop] Handoff request successful:`, {
      conversationId,
      handoffId: response.handoff?.id,
      status: response.handoff?.status,
      priority: response.handoff?.priority
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Handoff request failed:`, {
      conversationId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      payload,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

/**
 * Accept handoff as human agent
 */
export async function acceptHandoff(
  conversationId: string,
  payload: HandoffAcceptPayload,
  headers: Record<string, string>
): Promise<HandoffAcceptResponse> {
  console.log(`[Human in Loop] Accepting handoff for conversation: ${conversationId}`, {
    payload,
    endpoint: `/api/conversations/${conversationId}/accept-handoff`,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall(`/api/conversations/${conversationId}/accept-handoff`, {
      method: "POST",
      headers,
      body: payload,
    })

    console.log(`[Human in Loop] Handoff acceptance successful:`, {
      conversationId,
      agentId: response.agent?.id,
      agentName: response.agent?.name,
      message: response.message
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Handoff acceptance failed:`, {
      conversationId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      payload,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

/**
 * Get human agent dashboard data
 */
export async function getHumanAgentDashboard(
  headers: Record<string, string>
): Promise<HumanAgentDashboard> {
  console.log(`[Human in Loop] Fetching human agent dashboard`, {
    endpoint: '/api/human-agents/dashboard',
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall('/api/human-agents/dashboard', {
      method: "GET",
      headers,
    })

    console.log(`[Human in Loop] Dashboard data retrieved:`, {
      agentId: response.agent?.id,
      agentName: response.agent?.name,
      pendingCount: response.stats?.pendingCount || 0,
      assignedCount: response.stats?.assignedCount || 0,
      pendingHandoffs: response.pendingHandoffs?.length || 0,
      assignedConversations: response.assignedConversations?.length || 0
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Dashboard fetch failed:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

/**
 * Get priority queue of conversations
 */
export async function getPriorityQueue(
  headers: Record<string, string>,
  params: {
    limit?: number
    offset?: number
    mode?: string
  } = {}
): Promise<PriorityQueueResponse> {
  const queryParams = new URLSearchParams()
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.offset) queryParams.append('offset', params.offset.toString())
  if (params.mode) queryParams.append('mode', params.mode)

  const endpoint = `/api/conversations/priority-queue${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  console.log(`[Human in Loop] Fetching priority queue`, {
    endpoint,
    params,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall(endpoint, {
      method: "GET",
      headers,
    })

    console.log(`[Human in Loop] Priority queue retrieved:`, {
      totalConversations: response.conversations?.length || 0,
      totalCount: response.pagination?.total || 0,
      limit: response.pagination?.limit || 0,
      offset: response.pagination?.offset || 0,
      handoffRequests: response.conversations?.filter((c: Conversation) => c.hasHandoffRequest)?.length || 0
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Priority queue fetch failed:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      params,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

/**
 * Send message as human agent
 */
export async function sendHumanAgentMessage(
  conversationId: string,
  payload: SendMessagePayload,
  headers: Record<string, string>
): Promise<SendMessageResponse> {
  console.log(`[Human in Loop] Sending human agent message`, {
    conversationId,
    messageLength: payload.message?.length || 0,
    endpoint: `/api/conversations/${conversationId}/send-message`,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall(`/api/conversations/${conversationId}/send-message`, {
      method: "POST",
      headers,
      body: payload,
    })

    console.log(`[Human in Loop] Human agent message sent successfully:`, {
      conversationId,
      messageId: response.messageId,
      sentAt: response.sentAt,
      messagePreview: payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Human agent message send failed:`, {
      conversationId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      messageLength: payload.message?.length || 0,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

/**
 * Get conversation messages (enhanced for human agents)
 */
export async function getConversationMessages(
  conversationId: string,
  headers: Record<string, string>
): Promise<any> {
  console.log(`[Human in Loop] Fetching conversation messages`, {
    conversationId,
    endpoint: `/api/conversations/${conversationId}/messages`,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await apiCall(`/api/conversations/${conversationId}/messages`, {
      method: "GET",
      headers,
    })

    console.log(`[Human in Loop] Conversation messages retrieved:`, {
      conversationId,
      messageCount: Array.isArray(response.messages) ? response.messages.length : (Array.isArray(response) ? response.length : 0),
      hasHumanMessages: Array.isArray(response.messages) 
        ? response.messages.some((m: Message) => m.sender === 'human_agent')
        : Array.isArray(response) 
          ? response.some((m: Message) => m.sender === 'human_agent')
          : false
    })

    return response
  } catch (error) {
    console.error(`[Human in Loop] Conversation messages fetch failed:`, {
      conversationId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : error,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}
