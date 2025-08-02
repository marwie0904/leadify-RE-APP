"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Circle
} from "lucide-react"
import type { Conversation } from "@/types/human-in-loop"

interface AssignedConversationCardProps {
  conversation: Conversation
  onOpenChat: (conversationId: string) => void
  unreadCount?: number
}

export function AssignedConversationCard({ 
  conversation, 
  onOpenChat, 
  unreadCount = 0 
}: AssignedConversationCardProps) {
  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 3:
        return {
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
          label: "Urgent"
        }
      case 2:
        return {
          color: "text-orange-600",
          bgColor: "bg-orange-50 border-orange-200",
          label: "High"
        }
      default:
        return {
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
          label: "Normal"
        }
    }
  }

  const priorityConfig = getPriorityConfig(conversation.priority || 1)
  const lastMessageTime = conversation.last_message_at || conversation.lastMessageAt
  const timeAgo = lastMessageTime ? getTimeAgo(lastMessageTime) : "No messages"
  const customerName = conversation.user_name || conversation.leadName || "Unknown Customer"
  const lastMessage = conversation.lastMessage || "No messages yet"

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
      unreadCount > 0 ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
    }`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{customerName}</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-blue-600 text-white text-xs px-1.5 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {conversation.priority && conversation.priority > 1 && (
              <Badge variant="outline" className={`${priorityConfig.color} text-xs`}>
                {priorityConfig.label}
              </Badge>
            )}
            {conversation.source && (
              <Badge variant="outline" className="text-xs">
                {conversation.source}
              </Badge>
            )}
          </div>
        </div>

        {/* Last Message Preview */}
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-sm text-muted-foreground mb-1">Last message:</p>
          <p className="text-sm line-clamp-2">{lastMessage}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
            {conversation.agents?.name && (
              <div className="flex items-center space-x-1">
                <Circle className="h-3 w-3 text-blue-500" />
                <span>AI: {conversation.agents.name}</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => onOpenChat(conversation.id)}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Open Chat
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Activity Indicator */}
        {lastMessageTime && isRecentActivity(lastMessageTime) && (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Recent activity</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// Utility function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return new Date(timestamp).toLocaleDateString()
  }
}

// Check if activity is within the last 5 minutes
function isRecentActivity(timestamp: string): boolean {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
  return diffInMinutes <= 5
}