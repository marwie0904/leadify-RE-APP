"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bot, MessageSquare, RefreshCw } from "lucide-react"

interface AIAgent {
  id: string
  name: string
  tone: "Professional" | "Friendly" | "Neutral"
  language: "English" | "Tagalog"
  status: "creating" | "ready" | "error"
  user_id: string
  organization_id: string
  createdAt?: string
  openingMessage?: string
}

interface AgentsTableProps {
  agents: AIAgent[]
  onRefresh: () => void
  onCheckStatus: (agentId: string) => Promise<any>
  onChatWithAgent: (agent: AIAgent) => void
}

export function AgentsTable({ agents = [], onRefresh: _onRefresh, onCheckStatus, onChatWithAgent }: AgentsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-800"
      case "creating":
        return "bg-blue-100 text-blue-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "Professional":
        return "bg-blue-100 text-blue-800"
      case "Friendly":
        return "bg-green-100 text-green-800"
      case "Neutral":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const safeAgents = Array.isArray(agents) ? agents : []

  if (safeAgents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No AI agents created yet</p>
          <p className="text-xs">Create your first AI agent to get started</p>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Tone</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {safeAgents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span>{agent.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={getToneColor(agent.tone)}>{agent.tone}</Badge>
            </TableCell>
            <TableCell>{agent.language}</TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
                {agent.status === "creating" && (
                  <Button variant="ghost" size="sm" onClick={() => onCheckStatus(agent.id)} className="h-6 w-6 p-0">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  </Button>
                )}
              </div>
            </TableCell>
            <TableCell>{agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : "Unknown"}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChatWithAgent(agent)}
                  disabled={agent.status !== "ready"}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat Preview
                </Button>
                {/* Removed View Details as it's now part of AgentManagementPage */}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
