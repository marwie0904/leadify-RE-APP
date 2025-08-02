import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, buildQueryOptions } from '@/src/lib/react-query/utils'
import {
  Conversation,
  Message,
  ConversationFilters,
  PaginatedResponse,
} from '@/src/lib/react-query/types'

// Fetch conversations list with filters
export function useConversations(filters?: ConversationFilters) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.conversationsList(filters),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const queryParams = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value))
          }
        })
      }
      
      const endpoint = `/api/conversations${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`
      
      return queryFn<Conversation[]>(endpoint, { headers })
    },
    enabled: !!user,
    ...buildQueryOptions<Conversation[]>({
      staleTime: 1 * 60 * 1000, // 1 minute
    }),
  })
}

// Fetch single conversation by ID
export function useConversation(conversationId: string) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.conversationById(conversationId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<Conversation>(`/api/conversations/${conversationId}`, {
        headers,
      })
    },
    enabled: !!user && !!conversationId,
    ...buildQueryOptions<Conversation>(),
  })
}

// Fetch conversation messages with infinite scroll
export function useConversationMessages(conversationId: string) {
  const { user, getAuthHeaders } = useAuth()
  
  return useInfiniteQuery({
    queryKey: queryKeys.conversationMessages(conversationId),
    queryFn: async ({ pageParam = 1 }) => {
      const headers = await getAuthHeaders()
      return queryFn<PaginatedResponse<Message>>(
        `/api/conversations/${conversationId}/messages?page=${pageParam}&limit=20`,
        { headers }
      )
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    enabled: !!user && !!conversationId,
    ...buildQueryOptions<PaginatedResponse<Message>>({
      staleTime: 30 * 1000, // 30 seconds
    }),
  })
}

// Real-time conversation updates hook
export function useConversationSubscription(conversationId: string) {
  const { user } = useAuth()
  
  // This will be implemented with WebSocket in Phase 3
  // For now, we can poll for updates
  return useQuery({
    queryKey: [...queryKeys.conversationById(conversationId), 'subscription'],
    queryFn: async () => {
      // Placeholder for WebSocket subscription
      return null
    },
    enabled: false, // Disabled until WebSocket implementation
    refetchInterval: 5000, // Poll every 5 seconds when enabled
  })
}