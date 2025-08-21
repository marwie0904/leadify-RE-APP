"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MessageSquare, 
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useAuth } from "@/contexts/simple-auth-context"
import { acceptHandoff } from "@/lib/api"
import { toast } from "sonner"
import type { HandoffRequest } from "@/types/human-in-loop"

interface PendingHandoffCardProps {
  handoff: HandoffRequest
  onAccept: () => void
}

export function PendingHandoffCard({ handoff, onAccept }: PendingHandoffCardProps) {
  const { getAuthHeaders } = useAuth()
  const [accepting, setAccepting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [notes, setNotes] = useState("")

  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 3:
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Urgent",
          dotColor: "bg-red-500"
        }
      case 2:
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: <Clock className="h-3 w-3" />,
          label: "High",
          dotColor: "bg-orange-500"
        }
      default:
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <Clock className="h-3 w-3" />,
          label: "Normal",
          dotColor: "bg-green-500"
        }
    }
  }

  const handleAccept = async () => {
    if (!handoff.conversation_id) {
      toast.error("Invalid handoff request - missing conversation ID")
      return
    }

    console.log("[Pending Handoff] Accepting handoff:", {
      handoffId: handoff.id,
      conversationId: handoff.conversation_id,
      priority: handoff.priority,
      notes: notes.substring(0, 50) + (notes.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString()
    })

    setAccepting(true)

    try {
      const authHeaders = await getAuthHeaders()
      if (!('Authorization' in authHeaders)) {
        throw new Error('Authentication required - please log in again')
      }

      const payload = notes.trim() ? { notes: notes.trim() } : {}
      
      const response = await acceptHandoff(handoff.conversation_id, payload, authHeaders)

      console.log("[Pending Handoff] Handoff accepted successfully:", {
        conversationId: handoff.conversation_id,
        agentName: response.agent?.name,
        message: response.message
      })

      toast.success(`Handoff accepted successfully! You're now handling this conversation.`)
      onAccept() // Refresh the dashboard

    } catch (error) {
      console.error("[Pending Handoff] Failed to accept handoff:", {
        handoffId: handoff.id,
        conversationId: handoff.conversation_id,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error,
        timestamp: new Date().toISOString()
      })

      const errorMessage = error instanceof Error ? error.message : "Failed to accept handoff"
      toast.error(`Failed to accept handoff: ${errorMessage}`)
    } finally {
      setAccepting(false)
    }
  }

  const priorityConfig = getPriorityConfig(handoff.priority)
  const timeAgo = getTimeAgo(handoff.requested_at || handoff.created_at)
  const conversation = handoff.conversations

  return (
    <Card className="p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={`${priorityConfig.color} flex items-center space-x-1 px-2 py-1`}>
              {priorityConfig.icon}
              <span className="text-xs font-medium">{priorityConfig.label}</span>
            </Badge>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {timeAgo}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 w-6 p-0"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* Customer Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {conversation?.user_name || conversation?.leadName || "Unknown Customer"}
            </span>
          </div>
          {conversation?.source && (
            <Badge variant="outline" className="text-xs">
              {conversation.source}
            </Badge>
          )}
        </div>

        {/* Reason (if provided) */}
        {handoff.reason && (
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-sm text-muted-foreground mb-1">Reason for handoff:</p>
            <p className="text-sm">{handoff.reason}</p>
          </div>
        )}

        {/* Expanded Details */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Requested By:</span>
                <p className="font-medium">{handoff.requested_by || "User"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Agent:</span>
                <p className="font-medium">{conversation?.agents?.name || "Unknown"}</p>
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-2">
              <Label htmlFor={`notes-${handoff.id}`} className="text-xs">
                Notes (Optional)
              </Label>
              <Textarea
                id={`notes-${handoff.id}`}
                placeholder="Add any notes about accepting this handoff..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={200}
                className="text-xs"
                disabled={accepting}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/200 characters
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {accepting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-2" />
                Accept Handoff
              </>
            )}
          </Button>
        </div>
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
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}