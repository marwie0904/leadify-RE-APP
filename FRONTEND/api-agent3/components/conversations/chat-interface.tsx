"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send, Bot, User, XCircle, AlertCircle } from "lucide-react"
import { HandoffRequestButton } from "@/components/human-in-loop/handoff-request-button"

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
  onEndConversation?: (reason: string) => void
}

export function ChatInterface({ messages = [], onSendMessage, conversationId, onHandoffRequested, onEndConversation }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [endReason, setEndReason] = useState("")
  const [ending, setEnding] = useState(false)
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

  const handleEndConversation = async () => {
    if (!onEndConversation || ending) return

    setEnding(true)
    try {
      await onEndConversation(endReason || "Conversation ended by user")
      setShowEndDialog(false)
      setEndReason("")
    } catch (error) {
      console.error("Failed to end conversation:", error)
    } finally {
      setEnding(false)
    }
  }

  return (
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

      <div className="border-t p-4 space-y-3">
        {/* Message Input */}
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

        {/* Action Buttons */}
        {conversationId && (
          <div className="flex justify-between items-center gap-2">
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
              className="flex-1"
            />
            
            {onEndConversation && (
              <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    End Conversation
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                      End Conversation
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to end this conversation? This action cannot be undone.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="end-reason">Reason (Optional)</Label>
                      <Textarea
                        id="end-reason"
                        placeholder="Why are you ending this conversation? (e.g., Issue resolved, Customer satisfied, etc.)"
                        value={endReason}
                        onChange={(e) => setEndReason(e.target.value)}
                        rows={3}
                        maxLength={200}
                        disabled={ending}
                      />
                      <p className="text-xs text-muted-foreground">
                        {endReason.length}/200 characters
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowEndDialog(false)}
                        disabled={ending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEndConversation}
                        disabled={ending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {ending ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Ending...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            End Conversation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
