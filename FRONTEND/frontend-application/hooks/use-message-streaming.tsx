"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

// Global tracking to prevent multiple connections for same conversation
const activeConnections = new Map<string, boolean>()

// Supabase client for realtime subscriptions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

interface UseMessageStreamingProps {
  conversationId: string | null
  onNewMessage: (message: Message) => void
  authHeaders: Record<string, string>
}

export function useMessageStreaming({ 
  conversationId, 
  onNewMessage, 
  authHeaders 
}: UseMessageStreamingProps) {
  const subscriptionRef = useRef<any>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const isConnectedRef = useRef(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  // Cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    isConnectedRef.current = false
    
    // Remove from global tracking when cleaning up
    if (conversationId) {
      activeConnections.delete(conversationId)
      console.log("[Message Streaming] Removed connection tracking for:", conversationId)
    }
  }, [conversationId])

  // Polling fallback
  const startPolling = useCallback(async () => {
    if (!conversationId || !authHeaders) return

    console.log("[Message Streaming] Starting polling for conversation:", conversationId)

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const url = lastMessageIdRef.current 
          ? `${API_BASE_URL}/api/conversations/${conversationId}/messages?lastMessageId=${lastMessageIdRef.current}`
          : `${API_BASE_URL}/api/conversations/${conversationId}/messages`

        const response = await fetch(url, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.error("[Message Streaming] Polling error:", response.status)
          return
        }

        const data = await response.json()
        
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((message: any) => {
            const transformedMessage: Message = {
              id: message.id || Date.now().toString(),
              content: message.content || "",
              sender: message.sender || "ai",
              timestamp: message.sent_at || new Date().toISOString(),
            }
            
            onNewMessage(transformedMessage)
            lastMessageIdRef.current = message.id
          })
        }
      } catch (error) {
        console.error("[Message Streaming] Polling error:", error)
      }
    }, 2000) // Poll every 2 seconds
  }, [conversationId, authHeaders, onNewMessage, API_BASE_URL])

  // Supabase Realtime Subscription
  const startRealtimeSubscription = useCallback(() => {
    if (!conversationId) return

    console.log("[Message Streaming] Starting Supabase Realtime for conversation:", conversationId)

    try {
      // Create realtime subscription for new messages in this conversation
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log("[Message Streaming] New message received via Realtime:", payload)
            
            if (payload.new) {
              const transformedMessage: Message = {
                id: payload.new.id || Date.now().toString(),
                content: payload.new.content || "",
                sender: payload.new.sender || "ai",
                timestamp: payload.new.sent_at || new Date().toISOString(),
              }
              
              onNewMessage(transformedMessage)
            }
          }
        )
        .subscribe((status) => {
          console.log("[Message Streaming] Subscription status:", status)
          isConnectedRef.current = status === 'SUBSCRIBED'
          
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log("[Message Streaming] Realtime failed, falling back to polling")
            startPolling()
          }
        })

      subscriptionRef.current = channel

    } catch (error) {
      console.error("[Message Streaming] Failed to create Realtime subscription:", error)
      // Fallback to polling
      startPolling()
    }
  }, [conversationId, onNewMessage, startPolling])

  // Start streaming when conversation changes
  useEffect(() => {
    if (!conversationId) {
      cleanup()
      return
    }

    // Check if there's already an active connection for this conversation
    if (activeConnections.has(conversationId)) {
      console.log("[Message Streaming] Connection already exists for conversation:", conversationId, "- skipping")
      return
    }

    // Mark this conversation as having an active connection
    activeConnections.set(conversationId, true)
    console.log("[Message Streaming] Creating new connection for conversation:", conversationId)

    // Clean up any existing connections
    cleanup()

    // Try Supabase Realtime first, fallback to polling on error
    startRealtimeSubscription()

    // Cleanup on unmount or conversation change
    return cleanup
  }, [conversationId, startRealtimeSubscription, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isConnected: isConnectedRef.current,
    cleanup
  }
} 