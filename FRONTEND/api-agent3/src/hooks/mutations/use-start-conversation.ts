import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys } from '@/src/lib/react-query/utils'
import { Conversation } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'
import { migrateEndpoint, shouldUseMigratedEndpoint } from '@/lib/api/migration-helper'

interface StartConversationData {
  agentId: string
  userId: string
  source?: string
  metadata?: Record<string, any>
}

export function useStartConversation() {
  const queryClient = useQueryClient()
  const { user, getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: StartConversationData) => {
      const headers = await getAuthHeaders()
      
      // Use migration helper to determine correct endpoint
      const endpoint = shouldUseMigratedEndpoint() 
        ? '/api/v1/conversations'
        : '/api/conversations'
      
      return queryFn<Conversation>(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: data.agentId,
          userId: data.userId || user?.id,
          source: data.source || 'web',
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...data.metadata
          }
        }),
      })
    },
    
    onSuccess: (conversation, variables) => {
      // Invalidate conversations list to show new conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationsList(),
      })
      
      // Add to cache immediately for quick access
      queryClient.setQueryData(
        queryKeys.conversationById(conversation.id),
        conversation
      )
      
      success('Conversation started successfully')
      console.log('[StartConversation] New conversation created:', conversation.id)
    },
    
    onError: (err, variables) => {
      error('Failed to start conversation', err.message)
      console.error('[StartConversation] Error:', err)
    },
  })
}

// Hook for starting conversation with specific lead
export function useStartConversationWithLead() {
  const startConversation = useStartConversation()
  
  return useMutation({
    mutationFn: async (data: { leadId: string; agentId: string; source?: string }) => {
      return startConversation.mutateAsync({
        agentId: data.agentId,
        userId: data.leadId, // Lead ID as user ID in this context
        source: data.source || 'lead_management',
        metadata: {
          leadId: data.leadId,
          conversationType: 'lead_followup'
        }
      })
    },
    
    onSuccess: (conversation) => {
      console.log('[StartConversationWithLead] Conversation started for lead:', conversation)
    }
  })
}