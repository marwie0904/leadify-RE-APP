import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

export const organizationKeys = {
  all: ['organization'] as const,
  members: () => [...organizationKeys.all, 'members'] as const,
  agents: () => [...organizationKeys.all, 'agents'] as const,
}

export function useOrganizationMembers() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: organizationKeys.members(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getOrganizationMembers(headers)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useOrganizationAgents() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: organizationKeys.agents(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getAgents(headers) // Same endpoint as agents
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}