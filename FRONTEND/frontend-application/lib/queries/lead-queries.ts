import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"
import type { Lead } from '@/lib/validation/schemas'
import { toast } from 'sonner'

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters?: { assignedAgentId?: string }) => 
    [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
}

export function useLeads(filters?: { assignedAgentId?: string }) {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getLeads(headers, filters)
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useAssignAgentToLead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      const headers = await getAuthHeaders()
      return api.assignAgentToLead(leadId, agentId, headers)
    },
    onSuccess: (_, variables) => {
      // Invalidate leads list to refetch with updated data
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() })
      toast.success('Agent assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign agent: ${error.message}`)
    },
    // Optimistic update
    onMutate: async ({ leadId, agentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: leadKeys.lists() })

      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(leadKeys.lists())

      // Optimistically update to the new value
      queryClient.setQueryData(leadKeys.lists(), (old: any) => {
        if (!old) return old
        return {
          ...old,
          leads: old.leads.map((lead: Lead) =>
            lead.id === leadId ? { ...lead, assigned_agent_id: agentId } : lead
          ),
        }
      })

      // Return a context object with the snapshotted value
      return { previousLeads }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(leadKeys.lists(), context.previousLeads)
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() })
    },
  })
}