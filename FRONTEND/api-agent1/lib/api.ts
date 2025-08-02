// Re-export everything from the enhanced API client for backward compatibility
export * from './api-enhanced'

// Import the enhanced functions
import { apiCall as enhancedApiCall, api, getMigrationConfig } from './api-enhanced'
import * as schemas from './validation/schemas'

// Re-export the enhanced apiCall as the default
export { enhancedApiCall as apiCall }

// Human in the Loop API Functions - now with validation
import type {
  HandoffRequestPayload,
  HandoffRequestResponse,
  HandoffAcceptPayload,
  HandoffAcceptResponse,
  HumanAgentDashboard,
  PriorityQueueResponse,
  SendMessagePayload,
  SendMessageResponse,
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
    const response = await api.requestHandoff(conversationId, payload as any, headers)

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
    const response = await api.acceptHandoff(conversationId, payload, headers)

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
    const response = await api.getHumanAgentDashboard(headers)

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
  console.log(`[Human in Loop] Fetching priority queue`, {
    endpoint: '/api/conversations/priority-queue',
    params,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await api.getPriorityQueue(headers, params)

    console.log(`[Human in Loop] Priority queue retrieved:`, {
      totalConversations: response.conversations?.length || 0,
      totalCount: response.pagination?.total || 0,
      limit: response.pagination?.limit || 0,
      offset: response.pagination?.offset || 0,
      handoffRequests: response.conversations?.filter((c: any) => c.hasHandoffRequest)?.length || 0
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
    const response = await api.sendHumanAgentMessage(conversationId, payload, headers)

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
    const response = await api.getConversationMessages(conversationId, headers)

    console.log(`[Human in Loop] Conversation messages retrieved:`, {
      conversationId,
      messageCount: Array.isArray(response.messages) ? response.messages.length : (Array.isArray(response) ? response.length : 0),
      hasHumanMessages: Array.isArray(response.messages) 
        ? response.messages.some((m: any) => m.sender === 'human_agent')
        : Array.isArray(response) 
          ? response.some((m: any) => m.sender === 'human_agent')
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

// Export migration configuration for debugging and monitoring
export { getMigrationConfig }

// Log migration status for debugging
if (process.env.NODE_ENV === 'development') {
  const config = getMigrationConfig()
  console.log('[API] Migration status:', config.enabled ? 'ENABLED' : 'DISABLED')
}