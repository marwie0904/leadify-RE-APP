import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/react-query/utils'
import { Message, Conversation } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'

interface WebSocketMessage {
  type: 'message' | 'conversation_update' | 'agent_status' | 'analytics_update'
  data: any
  timestamp: string
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  
  constructor(url: string) {
    this.url = url
  }
  
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }
    
    try {
      this.ws = new WebSocket(`${this.url}?token=${token}`)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
      }
      
      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.reconnect(token)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      this.reconnect(token)
    }
  }
  
  private reconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting WebSocket... (attempt ${this.reconnectAttempts})`)
      this.connect(token)
    }, delay)
  }
  
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.listeners.clear()
  }
  
  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type)
    if (listeners) {
      listeners.forEach((callback) => callback(message.data))
    }
  }
  
  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }
  
  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
    } else {
      console.warn('WebSocket is not connected')
    }
  }
}

// Global WebSocket instance
let wsManager: WebSocketManager | null = null

// Hook to use WebSocket with React Query integration
export function useWebSocket(token?: string) {
  const queryClient = useQueryClient()
  const { info } = useNotificationStore()
  const wsRef = useRef<WebSocketManager | null>(null)
  
  useEffect(() => {
    if (!token) return
    
    // Initialize WebSocket manager
    if (!wsManager) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
      wsManager = new WebSocketManager(wsUrl)
    }
    
    wsRef.current = wsManager
    wsManager.connect(token)
    
    // Subscribe to message updates
    const unsubscribeMessage = wsManager.subscribe('message', (data: Message) => {
      // Update conversation messages
      queryClient.setQueryData(
        queryKeys.conversationMessages(data.conversation_id),
        (old: any) => {
          if (!old) return old
          
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              if (index === 0) {
                // Check if message already exists
                const exists = page.data.some((msg: Message) => msg.id === data.id)
                if (!exists) {
                  return {
                    ...page,
                    data: [data, ...page.data],
                  }
                }
              }
              return page
            }),
          }
        }
      )
      
      // Show notification for new customer messages
      if (data.sender_type === 'customer') {
        info('New message', `${data.sender_name}: ${data.content}`)
      }
    })
    
    // Subscribe to conversation updates
    const unsubscribeConversation = wsManager.subscribe(
      'conversation_update',
      (data: Conversation) => {
        // Update single conversation
        queryClient.setQueryData(queryKeys.conversationById(data.id), data)
        
        // Update in list
        queryClient.setQueryData(
          queryKeys.conversationsList(),
          (old: Conversation[] | undefined) => {
            if (!old) return old
            
            const exists = old.find((conv) => conv.id === data.id)
            if (exists) {
              return old.map((conv) => (conv.id === data.id ? data : conv))
            } else {
              return [data, ...old]
            }
          }
        )
      }
    )
    
    // Subscribe to agent status updates
    const unsubscribeAgent = wsManager.subscribe(
      'agent_status',
      (data: { agentId: string; status: string; progress?: number }) => {
        queryClient.setQueryData(
          [...queryKeys.agentById(data.agentId), 'status'],
          { status: data.status, progress: data.progress }
        )
        
        // Update agent in list if status changed to ready/error
        if (data.status === 'ready' || data.status === 'error') {
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentById(data.agentId),
          })
        }
      }
    )
    
    // Subscribe to analytics updates
    const unsubscribeAnalytics = wsManager.subscribe(
      'analytics_update',
      (data: any) => {
        // Invalidate analytics queries to refetch fresh data
        queryClient.invalidateQueries({
          queryKey: queryKeys.analytics(),
        })
      }
    )
    
    return () => {
      unsubscribeMessage()
      unsubscribeConversation()
      unsubscribeAgent()
      unsubscribeAnalytics()
      
      // Don't disconnect here as other components might be using it
    }
  }, [token, queryClient, info])
  
  return {
    send: (type: string, data: any) => wsRef.current?.send(type, data),
    connected: wsRef.current?.ws?.readyState === WebSocket.OPEN,
  }
}

// Hook for real-time conversation updates
export function useConversationRealtime(conversationId: string, enabled = true) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!enabled || !conversationId) return
    
    // This hook ensures the conversation data stays fresh
    // The actual subscription is handled by the main useWebSocket hook
    
    // You could add conversation-specific logic here if needed
    
    return () => {
      // Cleanup if needed
    }
  }, [conversationId, enabled, queryClient])
}