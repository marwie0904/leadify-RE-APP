"use client"

import { useEffect, useRef, useCallback } from "react"
import { migrateEndpoint, shouldUseMigratedEndpoint } from "@/lib/api/migration-helper"

// Global tracking to prevent multiple connections for same conversation
const activeConnections = new Map<string, boolean>()

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
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const isConnectedRef = useRef(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
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
        // Use migrated endpoint for polling
        const baseEndpoint = shouldUseMigratedEndpoint()
          ? `/api/v1/conversations/${conversationId}/messages`
          : `/api/messages/${conversationId}`
        
        const url = lastMessageIdRef.current 
          ? `${API_BASE_URL}${baseEndpoint}?lastMessageId=${lastMessageIdRef.current}`
          : `${API_BASE_URL}${baseEndpoint}`

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

  // Server-Sent Events
  const startSSE = useCallback(() => {
    if (!conversationId) return

    console.log("[Message Streaming] Starting SSE for conversation:", conversationId)

    try {
      // Create SSE connection with migrated endpoint
      const sseEndpoint = shouldUseMigratedEndpoint()
        ? `/api/v1/conversations/${conversationId}/messages/stream`
        : `/api/messages/${conversationId}/stream`
      
      const sseUrl = `${API_BASE_URL}${sseEndpoint}`
      console.log("[Message Streaming] Connecting to SSE URL:", sseUrl)
      
      eventSourceRef.current = new EventSource(sseUrl)

      eventSourceRef.current.onopen = () => {
        console.log("[Message Streaming] SSE connection opened")
        isConnectedRef.current = true
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("[Message Streaming] SSE message received:", data)

          if (data.type === 'new_message' && data.message) {
            const transformedMessage: Message = {
              id: data.message.id || Date.now().toString(),
              content: data.message.content || "",
              sender: data.message.sender || "ai",
              timestamp: data.message.sent_at || new Date().toISOString(),
            }
            
            onNewMessage(transformedMessage)
          }
        } catch (error) {
          console.error("[Message Streaming] Error parsing SSE message:", error)
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error("[Message Streaming] SSE connection error:", error)
        
        // Close SSE and fallback to polling
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
        
        if (!pollingIntervalRef.current) {
          console.log("[Message Streaming] Falling back to polling")
          startPolling()
        }
      }

    } catch (error) {
      console.error("[Message Streaming] Failed to create SSE connection:", error)
      // Fallback to polling
      startPolling()
    }
  }, [conversationId, onNewMessage, API_BASE_URL, startPolling])

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

    // Try SSE first, fallback to polling on error
    startSSE()

    // Cleanup on unmount or conversation change
    return cleanup
  }, [conversationId, startSSE, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isConnected: isConnectedRef.current,
    cleanup
  }
} 