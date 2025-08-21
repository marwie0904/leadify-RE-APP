import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"
import type { HandoffPriority } from '@/lib/validation/schemas'
import { toast } from 'sonner'

export const humanInLoopKeys = {
  all: ['humanInLoop'] as const,
  dashboard: () => [...humanInLoopKeys.all, 'dashboard'] as const,
  priorityQueue: () => [...humanInLoopKeys.all, 'priorityQueue'] as const,
  priorityQueueWithParams: (params: any) => 
    [...humanInLoopKeys.priorityQueue(), params] as const,
}

export function useHumanAgentDashboard() {
  const { getAuthHeaders, isHumanAgent } = useAuth()

  return useQuery({
    queryKey: humanInLoopKeys.dashboard(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getHumanAgentDashboard(headers)
    },
    enabled: isHumanAgent,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  })
}

export function usePriorityQueue(params?: {
  limit?: number
  offset?: number
  mode?: string
}) {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: humanInLoopKeys.priorityQueueWithParams(params),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getPriorityQueue(headers, params)
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export function useRequestHandoff() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      reason,
      priority = 1,
    }: {
      conversationId: string
      reason?: string
      priority?: HandoffPriority
    }) => {
      const headers = await getAuthHeaders()
      return api.requestHandoff(
        conversationId,
        { reason, priority, requested_by: 'user' } as any,
        headers
      )
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.detail(variables.conversationId) 
      })
      queryClient.invalidateQueries({ queryKey: humanInLoopKeys.priorityQueue() })
      toast.success('Handoff requested successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to request handoff: ${error.message}`)
    },
  })
}

export function useAcceptHandoff() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      notes,
    }: {
      conversationId: string
      notes?: string
    }) => {
      const headers = await getAuthHeaders()
      return api.acceptHandoff(conversationId, { notes }, headers)
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: humanInLoopKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: humanInLoopKeys.priorityQueue() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.detail(variables.conversationId) 
      })
      toast.success('Handoff accepted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept handoff: ${error.message}`)
    },
  })
}

export function useSendHumanAgentMessage() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
    }: {
      conversationId: string
      message: string
    }) => {
      const headers = await getAuthHeaders()
      return api.sendHumanAgentMessage(conversationId, { message }, headers)
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation messages
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.messages(variables.conversationId) 
      })
      // Also invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`)
    },
    // Optimistic update
    onMutate: async ({ conversationId, message }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: conversationKeys.messages(conversationId) 
      })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(
        conversationKeys.messages(conversationId)
      )

      // Optimistically update to the new value
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: message,
        sender: 'human_agent',
        timestamp: new Date().toISOString(),
      }

      queryClient.setQueryData(
        conversationKeys.messages(conversationId),
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

      return { previousMessages, conversationId }
    },
    // If the mutation fails, rollback
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
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.messages(variables.conversationId) 
      })
    },
  })
}

// Import conversation keys for invalidation
import { conversationKeys } from './conversation-queries'