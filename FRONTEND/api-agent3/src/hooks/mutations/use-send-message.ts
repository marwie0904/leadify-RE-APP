import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys } from '@/src/lib/react-query/utils'
import { Message, Conversation } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'
import { migrateEndpoint, shouldUseMigratedEndpoint } from '@/lib/api/migration-helper'

interface SendMessageData {
  conversationId: string
  content: string
  attachments?: string[]
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user, getAuthHeaders } = useAuth()
  const { error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async ({ conversationId, content, attachments }: SendMessageData) => {
      const headers = await getAuthHeaders()
      
      // Use migration helper to determine correct endpoint
      // Backend changed from /send-message to /messages
      const endpoint = shouldUseMigratedEndpoint()
        ? `/api/v1/conversations/${conversationId}/messages`
        : `/api/conversations/${conversationId}/messages`
      
      return queryFn<Message>(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content, 
          attachments,
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        }),
      })
    },
    
    // Optimistic update
    onMutate: async ({ conversationId, content, attachments }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversationMessages(conversationId),
      })
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_name: user?.name || 'Agent',
        content,
        attachments,
        created_at: new Date().toISOString(),
      }
      
      // Add to infinite query data
      queryClient.setQueryData(
        queryKeys.conversationMessages(conversationId),
        (old: any) => {
          if (!old) return old
          
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  data: [optimisticMessage, ...page.data],
                }
              }
              return page
            }),
          }
        }
      )
      
      // Update conversation's last message
      queryClient.setQueryData(
        queryKeys.conversationById(conversationId),
        (old: Conversation | undefined) => {
          if (!old) return old
          
          return {
            ...old,
            last_message: content,
            last_message_at: new Date().toISOString(),
          }
        }
      )
      
      return { optimisticMessage }
    },
    
    // Replace optimistic message with real one
    onSuccess: (data, { conversationId }) => {
      queryClient.setQueryData(
        queryKeys.conversationMessages(conversationId),
        (old: any) => {
          if (!old) return old
          
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              if (index === 0) {
                // Replace temp message with real one
                const messages = page.data.filter(
                  (msg: Message) => !msg.id.startsWith('temp-')
                )
                return {
                  ...page,
                  data: [data, ...messages],
                }
              }
              return page
            }),
          }
        }
      )
      
      // Invalidate conversation to get updated metadata
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversationById(conversationId),
      })
    },
    
    // Remove optimistic message on error
    onError: (err, { conversationId }, context) => {
      if (context?.optimisticMessage) {
        queryClient.setQueryData(
          queryKeys.conversationMessages(conversationId),
          (old: any) => {
            if (!old) return old
            
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.filter(
                  (msg: Message) => msg.id !== context.optimisticMessage.id
                ),
              })),
            }
          }
        )
      }
      
      error('Failed to send message', err.message)
    },
  })
}

// Mark messages as read
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const headers = await getAuthHeaders()
      
      // Use migration helper for mark as read endpoint
      const endpoint = shouldUseMigratedEndpoint()
        ? `/api/v1/conversations/${conversationId}/read`
        : `/api/conversations/${conversationId}/read`
      
      return queryFn(endpoint, {
        method: 'POST',
        headers,
      })
    },
    
    onSuccess: (_, conversationId) => {
      // Update unread count
      queryClient.setQueryData(
        queryKeys.conversationById(conversationId),
        (old: Conversation | undefined) => {
          if (!old) return old
          
          return {
            ...old,
            unread_count: 0,
          }
        }
      )
      
      // Update in list view
      queryClient.setQueryData(
        queryKeys.conversationsList(),
        (old: Conversation[] | undefined) => {
          if (!old) return old
          
          return old.map((conv) =>
            conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
          )
        }
      )
    },
  })
}