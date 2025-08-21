"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Facebook, Globe, Mail, MessageSquare, Phone } from "lucide-react"

interface Conversation {
  id: string
  title: string
  leadName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: "active" | "closed"
  source?: string
  classification?: string
  handoff?: boolean
}

interface ConversationsListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationsList({ conversations = [], selectedId, onSelect }: ConversationsListProps) {
  // Ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : []

  const getClassificationColor = (classification?: string) => {
    if (!classification) return "bg-gray-100 text-gray-800"

    switch (classification.toLowerCase()) {
      case "priority":
        return "bg-red-500 text-white"
      case "hot":
        return "bg-orange-500 text-white"
      case "warm":
        return "bg-yellow-500 text-black"
      case "cold":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSourceIcon = (source?: string) => {
    if (!source) return <MessageCircle className="h-4 w-4 text-muted-foreground" />

    const lowerSource = source.toLowerCase()
    
    // Debug logging to see what source values we're getting
    console.log(`[CONVERSATIONS] Source: "${source}" -> Lowercase: "${lowerSource}"`)

    if (lowerSource.includes("facebook") || lowerSource.includes("fb") || lowerSource.includes("messenger")) {
      return <Facebook className="h-4 w-4 text-blue-600" />
    }
    if (lowerSource.includes("email") || lowerSource.includes("mail")) {
      return <Mail className="h-4 w-4 text-gray-600" />
    }
    if (lowerSource.includes("web") || lowerSource.includes("website") || lowerSource.includes("site")) {
      return <Globe className="h-4 w-4 text-green-600" />
    }
    if (lowerSource.includes("phone") || lowerSource.includes("call") || lowerSource.includes("sms")) {
      return <Phone className="h-4 w-4 text-green-500" />
    }

    // Default icon for unknown sources
    console.log(`[CONVERSATIONS] Using default icon for source: "${source}"`)
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-2">
      {safeConversations.map((conversation) => (
        <Button
          key={conversation.id}
          variant={selectedId === conversation.id ? "default" : "ghost"}
          className="w-full justify-start h-auto p-3"
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex items-start space-x-3 w-full">
            <div className="flex-shrink-0 mt-1">{getSourceIcon(conversation.source)}</div>
            <div className="flex-1 text-left space-y-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{conversation.title}</span>
                <div className="flex items-center gap-1">
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {conversation.classification && (
                  <Badge className={`${getClassificationColor(conversation.classification)} text-xs`} variant="outline">
                    {conversation.classification}
                  </Badge>
                )}
                {conversation.source && (
                  <span className="text-xs text-muted-foreground capitalize">{conversation.source}</span>
                )}
              </div>

              {conversation.lastMessage && (
                <div className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(conversation.lastMessageAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  )
}
