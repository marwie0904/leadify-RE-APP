"use client"

import { Badge } from "@/components/ui/badge"
import { Bot, User, Clock, Loader2 } from "lucide-react"
import type { ConversationMode } from "@/types/human-in-loop"

interface ConversationModeIndicatorProps {
  mode: ConversationMode
  humanAgentName?: string
  loading?: boolean
  className?: string
}

export function ConversationModeIndicator({
  mode,
  humanAgentName,
  loading = false,
  className = ""
}: ConversationModeIndicatorProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'ai':
        return {
          icon: <Bot className="h-4 w-4" />,
          label: "AI Assistant",
          variant: "secondary" as const,
          bgColor: "bg-blue-50 border-blue-200 text-blue-700",
          description: "Chatting with AI assistant"
        }
      
      case 'handoff_requested':
        return {
          icon: loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />,
          label: "Connecting to Human Agent",
          variant: "secondary" as const,
          bgColor: "bg-amber-50 border-amber-200 text-amber-700",
          description: "Please wait while we connect you to a human agent"
        }
      
      case 'human':
        return {
          icon: <User className="h-4 w-4" />,
          label: humanAgentName ? `Human Agent: ${humanAgentName}` : "Human Agent",
          variant: "secondary" as const,
          bgColor: "bg-green-50 border-green-200 text-green-700",
          description: "Chatting with human agent"
        }
      
      default:
        return {
          icon: <Bot className="h-4 w-4" />,
          label: "AI Assistant",
          variant: "secondary" as const,
          bgColor: "bg-gray-50 border-gray-200 text-gray-700",
          description: "Chat mode unknown"
        }
    }
  }

  const config = getModeConfig()

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge 
        variant={config.variant}
        className={`${config.bgColor} flex items-center space-x-1 px-2 py-1`}
      >
        {config.icon}
        <span className="text-xs font-medium">{config.label}</span>
      </Badge>
      
      {mode === 'handoff_requested' && (
        <div className="flex items-center">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function to get mode from conversation data
export function getConversationMode(conversation: any): ConversationMode {
  // Check new handoff flag first
  if (conversation?.handoff === true) {
    return 'human'
  }
  
  // Legacy support - check mode field
  if (conversation?.mode) {
    return conversation.mode as ConversationMode
  }
  
  // Fallback logic based on other fields
  if (conversation?.assigned_human_agent_id) {
    return 'human'
  }
  
  if (conversation?.hasHandoffRequest) {
    return 'handoff_requested'
  }
  
  return 'ai' // Default to AI mode
}

// Utility function to get human agent name from conversation data
export function getHumanAgentName(conversation: any): string | undefined {
  return conversation?.human_agents?.name || conversation?.assignedAgentName
}