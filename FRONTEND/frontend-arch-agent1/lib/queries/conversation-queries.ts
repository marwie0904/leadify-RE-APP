import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import type { Conversation, Message } from '@/lib/validation/schemas'
import { toast } from 'sonner'

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: any) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,
}

export function useConversations() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getConversations(headers)
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  })
}

export function useConversationMessages(conversationId: string, enabled = true) {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getConversationMessages(conversationId, headers)
    },
    enabled: enabled && !!conversationId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      message: string
      conversationId?: string
      agentId?: string
      leadId?: string
    }) => {
      const headers = await getAuthHeaders()
      return api.sendChatMessage(data, headers)
    },
    onSuccess: (response, variables) => {
      // Invalidate conversation messages if conversationId exists
      if (variables.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: conversationKeys.messages(variables.conversationId) 
        })
      }
      // Also invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`)
    },
    // Optimistic update for better UX
    onMutate: async (variables) => {
      if (!variables.conversationId) return

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: conversationKeys.messages(variables.conversationId) 
      })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(
        conversationKeys.messages(variables.conversationId)
      )

      // Optimistically update to the new value
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: variables.message,
        sender: 'user',
        timestamp: new Date().toISOString(),
      }

      queryClient.setQueryData(
        conversationKeys.messages(variables.conversationId),
        (old: any) => {
          if (!old) return old
          
          // Handle both response formats
          if (Array.isArray(old)) {
            return [...old, optimisticMessage]
          } else if (old.messages && Array.isArray(old.messages)) {
            return {
              ...old,
              messages: [...old.messages, optimisticMessage],
            }
          }
          return old
        }
      )

      // Return a context object with the snapshotted value
      return { previousMessages, conversationId: variables.conversationId }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousMessages && context.conversationId) {
        queryClient.setQueryData(
          conversationKeys.messages(context.conversationId),
          context.previousMessages
        )
      }
    },
    // Always refetch after error or success
    onSettled: (data, error, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: conversationKeys.messages(variables.conversationId) 
        })
      }
    },
  })
}