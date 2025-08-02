import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, buildQueryOptions } from '@/src/lib/react-query/utils'
import { Lead, LeadFilters } from '@/src/lib/react-query/types'

// Fetch leads list with filters
export function useLeads(filters?: LeadFilters) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.leadsList(filters),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const queryParams = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value))
          }
        })
      }
      
      const endpoint = `/api/leads${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`
      
      return queryFn<Lead[]>(endpoint, { headers })
    },
    enabled: !!user,
    ...buildQueryOptions<Lead[]>({
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  })
}

// Fetch single lead by ID
export function useLead(leadId: string) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.leadById(leadId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<Lead>(`/api/leads/${leadId}`, { headers })
    },
    enabled: !!user && !!leadId,
    ...buildQueryOptions<Lead>(),
  })
}

// Fetch lead statistics
export function useLeadStats() {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: [...queryKeys.leads(), 'stats'],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{
        total: number
        byStatus: Record<string, number>
        byClassification: Record<string, number>
        conversionRate: number
      }>('/api/leads/stats', { headers })
    },
    enabled: !!user,
    ...buildQueryOptions({
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  })
}

// Prefetch lead data
export async function prefetchLead(leadId: string, queryClient: any) {
  const { getAuthHeaders } = useAuth()
  const headers = await getAuthHeaders()
  
  return queryClient.prefetchQuery({
    queryKey: queryKeys.leadById(leadId),
    queryFn: () => queryFn<Lead>(`/api/leads/${leadId}`, { headers }),
  })
}