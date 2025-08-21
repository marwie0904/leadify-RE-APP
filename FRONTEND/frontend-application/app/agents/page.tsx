"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Bot } from "lucide-react"
import { useAuth } from "@/contexts/simple-auth-context"
import { apiCall } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load heavy components
const CreateAgentModal = lazy(() => import("@/components/agents/create-agent-modal").then(mod => ({ default: mod.CreateAgentModal })))
const AgentManagementPage = lazy(() => import("@/components/agents/agent-management-page").then(mod => ({ default: mod.AgentManagementPage })))

// Loading component for agent management
function AgentManagementLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
  custom_greeting?: string // Custom greeting field from backend
}

export default function AgentsPage() {
  const { user, loading: authLoading, getAuthHeaders } = useAuth()
  const [existingAgent, setExistingAgent] = useState<AIAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    console.log("Agents page - user data:", {
      user: user?.email,
      organizationId: user?.organizationId,
      hasOrganization: user?.hasOrganization,
      authLoading,
    })

    if (!authLoading && user) {
      if (!user.hasOrganization || !user.organizationId) {
        console.log("User doesn't have an organization")
        // Don't try to fetch agents if user has no organization
        setLoading(false)
        setError("no-organization")
        return
      }
      fetchAgents()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchAgents = async () => {
    try {
      setError(null)
      setLoading(true)
      const authHeaders = await getAuthHeaders()

      const response = await apiCall("/api/agents", {
        headers: authHeaders,
      })

      console.log("Raw agents response:", response)

      // The backend returns { agents: [] } format
      const agentsData = response.agents || (Array.isArray(response) ? response : [])

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
          custom_greeting: agent.custom_greeting || "", // Add custom greeting from API
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
    customGreeting?: string
    documents: File[]
    attachments: Array<{
      id: string
      file: File
      type: 'image' | 'document' | 'video' | 'audio' | 'other'
      preview?: string
      uploadProgress?: number
      uploaded?: boolean
      error?: string
    }>
    bantConfiguration?: any
  }) => {
    console.log("handleCreateAgent called with:", agentData)

    try {
      console.log("Getting auth headers...")
      const authHeaders = await getAuthHeaders()
      console.log("Auth headers received:", authHeaders)

      if (!('Authorization' in authHeaders) || !authHeaders.Authorization) {
        throw new Error("No authentication token available. Please sign in again.")
      }

      console.log("Creating FormData...")
      const formData = new FormData()
      formData.append("name", agentData.name)
      formData.append("tone", agentData.tone)
      formData.append("language", agentData.language)
      formData.append("openingMessage", agentData.openingMessage)
      if (agentData.customGreeting) {
        formData.append("customGreeting", agentData.customGreeting)
      }
      
      // Add organizationId from the user context
      if (user?.organizationId) {
        formData.append("organizationId", user.organizationId)
        console.log("Added organizationId to FormData:", user.organizationId)
      } else {
        console.error("No organizationId available in user context")
        throw new Error("No organization selected. Please ensure you have joined an organization.")
      }

      console.log("Adding documents to FormData...")
      agentData.documents.forEach((file, index) => {
        console.log(`Adding legacy document ${index + 1}:`, file.name, file.size, file.type)
        formData.append("documents", file)
      })

      console.log("Adding attachments to FormData...")
      agentData.attachments.forEach((attachment, index) => {
        console.log(`Adding attachment ${index + 1}:`, attachment.file.name, attachment.file.size, attachment.type)
        formData.append("attachments", attachment.file)
        formData.append(`attachment_${index}_type`, attachment.type)
        formData.append(`attachment_${index}_id`, attachment.id)
      })

      // Add BANT configuration if provided
      if (agentData.bantConfiguration) {
        console.log("Adding BANT configuration to FormData...")
        formData.append("bantConfiguration", JSON.stringify(agentData.bantConfiguration))
      }

      console.log("Making API call to /api/agents...")
      const response = await apiCall("/api/agents", {
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
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <Card className="bg-white border-gray-200">
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

  if (error === "no-organization" || (!user.hasOrganization && !user.organizationId)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle>Organization Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to create or join an organization before you can create AI agents.
            </p>
            <Button onClick={() => window.location.href = "/organization"}>
              Go to Organization Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
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
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Agents</h1>
          </div>
          <p className="text-gray-600 ml-10">Configure and manage your AI-powered real estate agents</p>
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
          <Suspense fallback={<AgentManagementLoading />}>
            <AgentManagementPage agent={existingAgent} onAgentUpdated={fetchAgents} />
          </Suspense>

          {/* Comment out or remove this section until backend is ready */}
          {/* 
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold mb-4">Integrations</h2>
            <FacebookIntegration agentId={existingAgent.id} agentName={existingAgent.name} />
          </div>
          */}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
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

      <Suspense fallback={null}>
        <CreateAgentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateAgent} />
      </Suspense>
    </div>
  )
}
