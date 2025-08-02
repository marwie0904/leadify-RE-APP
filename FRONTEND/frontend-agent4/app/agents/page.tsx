"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"
import dynamic from 'next/dynamic'

const CreateAgentModal = dynamic(() => import('@/components/agents/create-agent-modal').then(mod => mod.CreateAgentModal), {
  ssr: false
})
import { Alert, AlertDescription } from "@/components/ui/alert"
const AgentManagementPage = dynamic(() => import('@/components/agents/agent-management-page').then(mod => mod.AgentManagementPage), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded" />,
  ssr: false
})

interface AIAgent {
  id: string
  name: string
  tone: "Professional" | "Friendly" | "Neutral"
  language: "English" | "Tagalog"
  status: "creating" | "ready" | "error"
  user_id: string
  organization_id: string
  createdAt?: string // From previous implementation, might be `created_at` in API
  openingMessage?: string // New field for configuration
}

export default function AgentsPage() {
  const { user, loading: authLoading, getAuthHeaders, refreshUserOrganization } = useAuth()
  const [existingAgent, setExistingAgent] = useState<AIAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    console.log("Agents page - user data:", {
      user: user?.email,
      organizationId: user?.organizationId,
      authLoading,
    })

    if (!authLoading && user) {
      if (!user.organizationId) {
        console.log("No organization ID found, attempting to refresh...")

        // Try to refresh organization info
        refreshUserOrganization()
          .then(() => {
            // Give some time for the state to update
            setTimeout(() => {
              // Check if we now have organization info
              if (user.organizationId) {
                fetchAgents()
              } else {
                // Still no organization, but let's try to fetch agents anyway
                // The API might handle organization logic internally
                console.log("Still no organization ID, trying to fetch agents anyway...")
                fetchAgents()
              }
            }, 500)
          })
          .catch(() => {
            // Even if refresh fails, try to fetch agents
            console.log("Organization refresh failed, trying to fetch agents anyway...")
            fetchAgents()
          })
        return
      }
      fetchAgents()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, refreshUserOrganization])

  const fetchAgents = async () => {
    try {
      setError(null)
      setLoading(true)
      const authHeaders = await getAuthHeaders()

      const response = await apiCall("/api/agents", {
        headers: authHeaders,
      })

      console.log("Raw agents response:", response)

      const agentsData = Array.isArray(response) ? response : []

      if (agentsData.length > 0) {
        // Assuming only one agent per organization for now
        const agent = agentsData[0]
        setExistingAgent({
          id: agent.id || "",
          name: agent.name || "Unnamed Agent",
          tone: agent.tone || "Professional",
          language: agent.language || "English",
          status: agent.status || "ready",
          user_id: agent.user_id || "",
          organization_id: agent.organization_id || "",
          createdAt: agent.created_at || new Date().toISOString(),
          openingMessage: agent.openingMessage || "", // Assuming this comes from the API
        })
      } else {
        setExistingAgent(null)
      }
    } catch (error) {
      console.error("Failed to fetch AI agents:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch AI agents"
      setError(errorMessage)
      setExistingAgent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async (agentData: {
    name: string
    tone: string
    language: string
    openingMessage: string
    documents: File[]
  }) => {
    console.log("handleCreateAgent called with:", agentData)

    try {
      console.log("Getting auth headers...")
      const authHeaders = await getAuthHeaders()
      console.log("Auth headers received:", authHeaders)

      if (!authHeaders.Authorization) {
        throw new Error("No authentication token available. Please sign in again.")
      }

      console.log("Creating FormData...")
      const formData = new FormData()
      formData.append("name", agentData.name)
      formData.append("tone", agentData.tone)
      formData.append("language", agentData.language)
      formData.append("openingMessage", agentData.openingMessage)

      console.log("Adding documents to FormData...")
      agentData.documents.forEach((file, index) => {
        console.log(`Adding document ${index + 1}:`, file.name, file.size, file.type)
        formData.append("documents", file)
      })

      console.log("Making API call to /api/agents/create...")
      const response = await apiCall("/api/agents/create", {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
      })

      console.log("Agent created successfully:", response)

      // Show success message
      alert("AI Agent created successfully!")

      fetchAgents() // Refresh the agents list to show the new agent
      setShowCreateModal(false)
      return response
    } catch (error) {
      console.error("Failed to create AI agent:", error)

      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : "Failed to create AI agent"
      alert(`Error creating AI agent: ${errorMessage}`)

      throw error
    }
  }

  // Add this function for debugging:
  const testCreateAgent = () => {
    console.log("Create Agent button clicked!")
    console.log("User:", user)
    console.log("Show create modal state:", showCreateModal)
    setShowCreateModal(true)
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please sign in to access AI Agents.</p>
            <Button onClick={() => (window.location.href = "/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user.organizationId && error && error.includes("organization")) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              <p>Please create or join an organization to create or access AI Agents.</p>
              <p className="text-xs">You can manage your organization in the "Organization" tab.</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Error loading AI agents: {error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={fetchAgents} variant="outline">
            Retry Loading Agents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">Create and manage your AI-powered conversation agents</p>
        </div>
        {!existingAgent && (
          <Button onClick={testCreateAgent}>
            <Plus className="mr-2 h-4 w-4" />
            Create AI Agent
          </Button>
        )}
      </div>

      {existingAgent ? (
        <div className="space-y-6">
          <AgentManagementPage agent={existingAgent} onAgentUpdated={fetchAgents} />

          {/* Comment out or remove this section until backend is ready */}
          {/* 
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold mb-4">Integrations</h2>
            <FacebookIntegration agentId={existingAgent.id} agentName={existingAgent.name} />
          </div>
          */}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No AI Agent Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              It looks like your organization doesn't have an AI agent yet. Create one to get started!
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create AI Agent
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateAgentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateAgent} />
    </div>
  )
}
