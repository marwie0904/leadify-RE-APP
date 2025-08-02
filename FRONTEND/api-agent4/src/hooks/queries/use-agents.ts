import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, buildQueryOptions } from '@/src/lib/react-query/utils'
import { Agent } from '@/src/lib/react-query/types'

// Fetch all agents for the organization
export function useAgents() {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.agentsList(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<Agent[]>('/api/agents', { headers })
    },
    enabled: !!user,
    ...buildQueryOptions<Agent[]>({
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  })
}

// Fetch single agent by ID
export function useAgent(agentId: string) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.agentById(agentId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<Agent>(`/api/agents/${agentId}`, { headers })
    },
    enabled: !!user && !!agentId,
    ...buildQueryOptions<Agent>(),
  })
}

// Check agent status (useful for polling during creation)
export function useAgentStatus(agentId: string, options?: { refetchInterval?: number }) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: [...queryKeys.agentById(agentId), 'status'],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{ status: Agent['status']; progress?: number }>(
        `/api/agents/${agentId}/status`,
        { headers }
      )
    },
    enabled: !!user && !!agentId,
    refetchInterval: options?.refetchInterval ?? false,
    ...buildQueryOptions({
      staleTime: 0, // Always fresh for status checks
    }),
  })
}

// Fetch agent performance metrics
export function useAgentPerformance(agentId: string) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: [...queryKeys.agentById(agentId), 'performance'],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{
        conversations_handled: number
        average_response_time: string
        satisfaction_score: number
        resolution_rate: number
        escalation_rate: number
      }>(`/api/agents/${agentId}/performance`, { headers })
    },
    enabled: !!user && !!agentId,
    ...buildQueryOptions({
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),
  })
}