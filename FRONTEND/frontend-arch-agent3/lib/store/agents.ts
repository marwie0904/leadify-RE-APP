import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface AIAgent {
  id: string
  name: string
  tone: "Professional" | "Friendly" | "Neutral"
  language: "English" | "Tagalog"
  status: "creating" | "ready" | "error"
  user_id: string
  organization_id: string
  createdAt?: string
  openingMessage?: string
  description?: string
}

export interface AgentDocument {
  id: string
  name: string
  size: number
  status: "processing" | "ready" | "error"
  storagePath?: string
  createdAt: string
  updatedAt: string
  agent_id: string
  type?: "estimation" | "conversation_reference" | "general"
}

export interface AgentIntegration {
  id: string
  agent_id: string
  platform: "facebook" | "instagram" | "whatsapp"
  status: "connected" | "disconnected" | "error"
  connected_at?: string
  metadata?: Record<string, any>
}

interface AgentsState {
  // State
  agents: AIAgent[]
  selectedAgentId: string | null
  documents: Record<string, AgentDocument[]> // Keyed by agent ID
  integrations: Record<string, AgentIntegration[]> // Keyed by agent ID
  loading: boolean
  error: string | null

  // Actions
  setAgents: (agents: AIAgent[]) => void
  addAgent: (agent: AIAgent) => void
  updateAgent: (id: string, updates: Partial<AIAgent>) => void
  removeAgent: (id: string) => void
  selectAgent: (id: string | null) => void
  
  // Document actions
  setDocuments: (agentId: string, documents: AgentDocument[]) => void
  addDocument: (agentId: string, document: AgentDocument) => void
  updateDocument: (agentId: string, documentId: string, updates: Partial<AgentDocument>) => void
  removeDocument: (agentId: string, documentId: string) => void
  
  // Integration actions
  setIntegrations: (agentId: string, integrations: AgentIntegration[]) => void
  updateIntegration: (agentId: string, integrationId: string, updates: Partial<AgentIntegration>) => void
  
  // Utility actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  agents: [],
  selectedAgentId: null,
  documents: {},
  integrations: {},
  loading: false,
  error: null,
}

export const useAgentsStore = create<AgentsState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setAgents: (agents) =>
          set((state) => ({ ...state, agents })),

        addAgent: (agent) =>
          set((state) => ({ 
            ...state, 
            agents: [...state.agents, agent] 
          })),

        updateAgent: (id, updates) =>
          set((state) => ({
            ...state,
            agents: state.agents.map((agent) =>
              agent.id === id ? { ...agent, ...updates } : agent
            ),
          })),

        removeAgent: (id) =>
          set((state) => ({
            ...state,
            agents: state.agents.filter((agent) => agent.id !== id),
            documents: { ...state.documents, [id]: undefined },
            integrations: { ...state.integrations, [id]: undefined },
          })),

        selectAgent: (id) =>
          set((state) => ({ ...state, selectedAgentId: id })),

        // Document management
        setDocuments: (agentId, documents) =>
          set((state) => ({
            ...state,
            documents: { ...state.documents, [agentId]: documents },
          })),

        addDocument: (agentId, document) =>
          set((state) => ({
            ...state,
            documents: {
              ...state.documents,
              [agentId]: [...(state.documents[agentId] || []), document],
            },
          })),

        updateDocument: (agentId, documentId, updates) =>
          set((state) => ({
            ...state,
            documents: {
              ...state.documents,
              [agentId]: (state.documents[agentId] || []).map((doc) =>
                doc.id === documentId ? { ...doc, ...updates } : doc
              ),
            },
          })),

        removeDocument: (agentId, documentId) =>
          set((state) => ({
            ...state,
            documents: {
              ...state.documents,
              [agentId]: (state.documents[agentId] || []).filter(
                (doc) => doc.id !== documentId
              ),
            },
          })),

        // Integration management
        setIntegrations: (agentId, integrations) =>
          set((state) => ({
            ...state,
            integrations: { ...state.integrations, [agentId]: integrations },
          })),

        updateIntegration: (agentId, integrationId, updates) =>
          set((state) => ({
            ...state,
            integrations: {
              ...state.integrations,
              [agentId]: (state.integrations[agentId] || []).map((integration) =>
                integration.id === integrationId
                  ? { ...integration, ...updates }
                  : integration
              ),
            },
          })),

        setLoading: (loading) =>
          set((state) => ({ ...state, loading })),

        setError: (error) =>
          set((state) => ({ ...state, error })),

        reset: () => set(initialState),
      }),
      {
        name: 'agents-storage',
        partialize: (state) => ({ 
          agents: state.agents,
          selectedAgentId: state.selectedAgentId,
          documents: state.documents,
          integrations: state.integrations,
        }),
      }
    )
  )
)