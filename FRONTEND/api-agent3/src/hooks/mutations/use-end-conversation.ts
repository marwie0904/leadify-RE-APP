import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys } from '@/src/lib/react-query/utils'
import { Conversation } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'
import { migrateEndpoint, shouldUseMigratedEndpoint } from '@/lib/api/migration-helper'

interface EndConversationData {
  conversationId: string
  reason: string
  metadata?: Record<string, any>
}

export function useEndConversation() {
  const queryClient = useQueryClient()
  const { user, getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async ({ conversationId, reason, metadata }: EndConversationData) => {
      const headers = await getAuthHeaders()
      
      // Use migration helper to determine correct endpoint
      const endpoint = shouldUseMigratedEndpoint()
        ? `/api/v1/conversations/${conversationId}/end`
        : `/api/conversations/${conversationId}/end`
      
      return queryFn(endpoint, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          metadata: {
            endedBy: user?.id || 'unknown',
            endedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...metadata
          }
        }),
      })
    },
    
    // Optimistic update
    onMutate: async ({ conversationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversationById(conversationId),
      })
      
      // Snapshot the previous conversation state
      const previousConversation = queryClient.getQueryData<Conversation>(
        queryKeys.conversationById(conversationId)
      )
      
      // Optimistically update conversation status
      if (previousConversation) {
        queryClient.setQueryData(
          queryKeys.conversationById(conversationId),
          {
            ...previousConversation,
            status: 'ended' as const,
            ended_at: new Date().toISOString(),
          }
        )
      }
      
      return { previousConversation }
    },
    
    onSuccess: (_, { conversationId, reason }) => {
      // Invalidate and refetch conversation data
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationById(conversationId),
      })
      
      // Invalidate conversations list to reflect status change
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationsList(),
      })
      
      // Invalidate any message queries for this conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationMessages(conversationId),
      })
      
      success('Conversation ended successfully')
      console.log('[EndConversation] Conversation ended:', conversationId, 'Reason:', reason)
    },
    
    // Revert optimistic update on error
    onError: (err, { conversationId }, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          queryKeys.conversationById(conversationId),
          context.previousConversation
        )
      }
      
      error('Failed to end conversation', err.message)
      console.error('[EndConversation] Error:', err)
    },
  })
}

// Hook for bulk ending conversations (admin functionality)
export function useBulkEndConversations() {
  const endConversation = useEndConversation()
  const queryClient = useQueryClient()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: { conversationIds: string[]; reason: string }) => {
      const results = await Promise.allSettled(
        data.conversationIds.map(id =>
          endConversation.mutateAsync({
            conversationId: id,
            reason: data.reason,
            metadata: { bulkOperation: true }
          })
        )
      )
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      return { successful, failed, total: data.conversationIds.length }
    },
    
    onSuccess: ({ successful, failed, total }) => {
      if (failed === 0) {
        success(`Successfully ended ${successful} conversations`)
      } else {
        error(`Ended ${successful} conversations, ${failed} failed`)
      }
      
      // Refresh the conversations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationsList(),
      })
    },
    
    onError: (err) => {
      error('Bulk end operation failed', err.message)
    }
  })
}