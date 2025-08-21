"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, RefreshCw, Plus, Loader2, Info } from "lucide-react"
import { HandoffRequestButton } from "@/components/human-in-loop/handoff-request-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  conversationId?: string | null
  onHandoffRequested?: () => void
  onRefreshConversation?: () => void
  onNewConversation?: () => void
  agentId?: string | null
}

export function ChatInterface({ 
  messages = [], 
  onSendMessage, 
  conversationId, 
  onHandoffRequested,
  onRefreshConversation,
  onNewConversation,
  agentId
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : []

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [safeMessages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(newMessage)
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "ai":
        return <Bot className="h-4 w-4" />
      case "user":
        return <User className="h-4 w-4" />
      case "system":
        return <Info className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case "ai":
        return "bg-blue-100 text-blue-800"
      case "user":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleRefreshConversation = async () => {
    if (!onRefreshConversation || refreshing) return
    
    setRefreshing(true)
    try {
      await onRefreshConversation()
      toast.success("Conversation refreshed")
    } catch (error) {
      console.error("Failed to refresh conversation:", error)
      toast.error("Failed to refresh conversation")
    } finally {
      setRefreshing(false)
    }
  }

  const handleNewConversation = async () => {
    if (!onNewConversation) return
    
    try {
      await onNewConversation()
      toast.success("New conversation created")
    } catch (error) {
      console.error("Failed to create new conversation:", error)
      toast.error("Failed to create new conversation")
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[500px]">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {safeMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {safeMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${getSenderColor(message.sender)}`}>
                  {getSenderIcon(message.sender)}
                </div>
                <div className="flex-1">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        {conversationId ? (
          <div className="flex justify-center">
            <HandoffRequestButton
              conversationId={conversationId}
              disabled={handoffRequested}
              onHandoffRequested={() => {
                console.log("[ChatInterface] Handoff requested for conversation:", conversationId)
                setHandoffRequested(true)
                if (onHandoffRequested) {
                  onHandoffRequested()
                }
              }}
              className="w-full max-w-xs"
            />
          </div>
        ) : (
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  )
}
