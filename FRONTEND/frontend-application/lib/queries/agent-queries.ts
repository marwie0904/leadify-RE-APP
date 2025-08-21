import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"
import type { Agent } from '@/lib/validation/schemas'
import { toast } from 'sonner'

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: any) => [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
}

export function useAgents() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getAgents(headers)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (data: Partial<Agent>) => {
      const headers = await getAuthHeaders()
      return api.createAgent(data, headers)
    },
    onSuccess: () => {
      // Invalidate and refetch agents list
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
      toast.success('Agent created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create agent: ${error.message}`)
    },
  })
}