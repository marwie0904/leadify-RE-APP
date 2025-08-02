import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, invalidateQueries } from '@/src/lib/react-query/utils'
import { Agent } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'

interface CreateAgentData {
  name: string
  tone: Agent['tone']
  language: Agent['language']
  openingMessage?: string
  knowledgeBase?: string
  responseGuidelines?: string
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error, info } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: CreateAgentData) => {
      const headers = await getAuthHeaders()
      return queryFn<Agent>('/api/agents', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    },
    
    onMutate: async (newAgent) => {
      // Show creating notification
      info('Creating agent...', 'This may take a few moments')
      
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.agentsList() })
      
      // Snapshot previous value
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKeys.agentsList())
      
      // Create optimistic agent
      const optimisticAgent: Agent = {
        id: `temp-${Date.now()}`,
        ...newAgent,
        status: 'creating',
        user_id: 'current-user',
        organization_id: 'current-org',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Add to list
      queryClient.setQueryData<Agent[]>(queryKeys.agentsList(), (old) => {
        if (!old) return [optimisticAgent]
        return [optimisticAgent, ...old]
      })
      
      return { previousAgents, optimisticAgent }
    },
    
    onSuccess: (data) => {
      // Replace optimistic agent with real one
      queryClient.setQueryData<Agent[]>(queryKeys.agentsList(), (old) => {
        if (!old) return [data]
        
        return old.map((agent) =>
          agent.id.startsWith('temp-') ? data : agent
        )
      })
      
      success('Agent created successfully', 'Your AI agent is now ready to use')
      
      // Start polling for status updates if still creating
      if (data.status === 'creating') {
        // This will be handled by useAgentStatus hook with refetchInterval
      }
    },
    
    onError: (err, newAgent, context) => {
      // Rollback
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agentsList(), context.previousAgents)
      }
      error('Failed to create agent', err.message)
    },
  })
}

// Update agent configuration
export function useUpdateAgent() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async ({
      agentId,
      updates,
    }: {
      agentId: string
      updates: Partial<CreateAgentData>
    }) => {
      const headers = await getAuthHeaders()
      return queryFn<Agent>(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
    },
    
    onMutate: async ({ agentId, updates }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.agentById(agentId) })
      
      // Snapshot
      const previousAgent = queryClient.getQueryData<Agent>(
        queryKeys.agentById(agentId)
      )
      const previousAgents = queryClient.getQueryData<Agent[]>(
        queryKeys.agentsList()
      )
      
      // Optimistic update
      if (previousAgent) {
        const updatedAgent = {
          ...previousAgent,
          ...updates,
          updated_at: new Date().toISOString(),
        }
        
        queryClient.setQueryData<Agent>(
          queryKeys.agentById(agentId),
          updatedAgent
        )
        
        // Update in list
        queryClient.setQueryData<Agent[]>(queryKeys.agentsList(), (old) => {
          if (!old) return old
          
          return old.map((agent) =>
            agent.id === agentId ? updatedAgent : agent
          )
        })
      }
      
      return { previousAgent, previousAgents }
    },
    
    onError: (err, { agentId }, context) => {
      // Rollback
      if (context?.previousAgent) {
        queryClient.setQueryData(
          queryKeys.agentById(agentId),
          context.previousAgent
        )
      }
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agentsList(), context.previousAgents)
      }
      error('Failed to update agent', err.message)
    },
    
    onSuccess: () => {
      success('Agent updated successfully')
    },
    
    onSettled: (_, __, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentById(agentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.agentsList() })
    },
  })
}

// Delete agent
export function useDeleteAgent() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getAuthHeaders()
      return queryFn(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers,
      })
    },
    
    onMutate: async (agentId) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.agentsList() })
      
      // Snapshot
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKeys.agentsList())
      
      // Remove from list
      queryClient.setQueryData<Agent[]>(queryKeys.agentsList(), (old) => {
        if (!old) return old
        return old.filter((agent) => agent.id !== agentId)
      })
      
      return { previousAgents }
    },
    
    onError: (err, agentId, context) => {
      // Rollback
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agentsList(), context.previousAgents)
      }
      error('Failed to delete agent', err.message)
    },
    
    onSuccess: () => {
      success('Agent deleted successfully')
    },
    
    onSettled: () => {
      queryClient.invalidateQueries(invalidateQueries.agents())
    },
  })
}

// Train agent with additional data
export function useTrainAgent() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error, info } = useNotificationStore()
  
  return useMutation({
    mutationFn: async ({
      agentId,
      trainingData,
    }: {
      agentId: string
      trainingData: {
        documents?: string[]
        faqs?: Array<{ question: string; answer: string }>
        examples?: Array<{ input: string; output: string }>
      }
    }) => {
      const headers = await getAuthHeaders()
      return queryFn<{ success: boolean; message: string }>(
        `/api/agents/${agentId}/train`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trainingData),
        }
      )
    },
    
    onMutate: () => {
      info('Training agent...', 'This process may take several minutes')
    },
    
    onSuccess: (data) => {
      success('Agent trained successfully', data.message)
    },
    
    onError: (err) => {
      error('Failed to train agent', err.message)
    },
    
    onSettled: (_, __, { agentId }) => {
      // Invalidate agent to refresh any updated capabilities
      queryClient.invalidateQueries({ queryKey: queryKeys.agentById(agentId) })
    },
  })
}