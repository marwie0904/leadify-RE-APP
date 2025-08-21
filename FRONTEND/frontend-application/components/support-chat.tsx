"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  CheckCircle,
  User,
  HeadphonesIcon,
  Minimize2,
  Maximize2
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Message {
  id: string
  message: string
  senderType: 'user' | 'admin' | 'system'
  senderName: string
  createdAt: string
}

interface SupportChatProps {
  className?: string
}

export function SupportChat({ className }: SupportChatProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'resolved'>('disconnected')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Start support chat
  const startChat = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/support/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          subject: "Support Chat Request",
          initialMessage: "User started a support chat",
          category: 'general'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start support chat')
      }

      const data = await response.json()
      setTicketId(data.data.ticketId)
      setStatus('connected')
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        message: "Hello! How can I help you today? An admin will be with you shortly.",
        senderType: 'system',
        senderName: 'System',
        createdAt: new Date().toISOString()
      }])

      // Connect to SSE stream
      connectToStream(data.data.ticketId)
      
    } catch (error) {
      console.error('Error starting chat:', error)
      toast.error("Failed to start support chat")
    } finally {
      setIsLoading(false)
    }
  }

  // Connect to SSE stream for real-time messages
  const connectToStream = (ticketId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/support/stream/${ticketId}`
    )

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.message])
          scrollToBottom()
        } else if (data.type === 'ticket_resolved') {
          setStatus('resolved')
          toast.success("Support ticket has been resolved")
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setStatus('disconnected')
    }

    eventSourceRef.current = eventSource
  }

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !ticketId) return

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      message: inputMessage,
      senderType: 'user',
      senderName: user?.email?.split('@')[0] || 'You',
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMessage])
    setInputMessage("")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/support/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          ticketId,
          message: inputMessage
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error("Failed to send message")
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    }
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 100)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Chat button
  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true)
          if (!ticketId) startChat()
        }}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  // Chat window
  return (
    <Card className={`fixed bottom-6 right-6 shadow-2xl z-50 transition-all ${
      isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'
    } ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Support Chat</h3>
            {!isMinimized && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-green-400' : 
                  status === 'resolved' ? 'bg-gray-400' : 'bg-red-400'
                }`} />
                <span className="text-xs">
                  {status === 'connected' ? 'Connected' : 
                   status === 'resolved' ? 'Resolved' : 'Disconnected'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white hover:bg-white/20"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false)
              if (eventSourceRef.current) {
                eventSourceRef.current.close()
              }
            }}
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderType === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${
                      message.senderType === 'user' ? 'flex-row-reverse' : ''
                    }`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.senderType === 'user' ? <User className="h-4 w-4" /> : 
                           message.senderType === 'admin' ? <HeadphonesIcon className="h-4 w-4" /> :
                           '🤖'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className={`rounded-lg px-3 py-2 ${
                          message.senderType === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : message.senderType === 'system'
                            ? 'bg-gray-100 text-gray-700 italic'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(message.createdAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          {status !== 'resolved' && (
            <div className="p-3 border-t">
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
                className="flex gap-2"
              >
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={status !== 'connected' || isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit"
                  size="icon"
                  disabled={!inputMessage.trim() || status !== 'connected' || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}

          {status === 'resolved' && (
            <div className="p-3 border-t bg-green-50">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">This ticket has been resolved</span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}