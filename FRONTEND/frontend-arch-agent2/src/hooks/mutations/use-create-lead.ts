import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, invalidateQueries } from '@/src/lib/react-query/utils'
import { Lead } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'

interface CreateLeadData {
  name: string
  email: string
  phone?: string
  company?: string
  source: string
  notes?: string
  classification?: Lead['classification']
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const headers = await getAuthHeaders()
      return queryFn<Lead>('/api/leads', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    },
    
    // Optimistic update
    onMutate: async (newLead) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsList() })
      
      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leadsList())
      
      // Create optimistic lead
      const optimisticLead: Lead = {
        id: `temp-${Date.now()}`,
        ...newLead,
        status: 'new',
        classification: newLead.classification || 'Cold',
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Optimistically update the list
      queryClient.setQueryData<Lead[]>(queryKeys.leadsList(), (old) => {
        if (!old) return [optimisticLead]
        return [optimisticLead, ...old]
      })
      
      return { previousLeads, optimisticLead }
    },
    
    // Replace optimistic lead with real one
    onSuccess: (data) => {
      queryClient.setQueryData<Lead[]>(queryKeys.leadsList(), (old) => {
        if (!old) return [data]
        
        // Replace temp lead with real one
        return old.map((lead) =>
          lead.id.startsWith('temp-') ? data : lead
        )
      })
      
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.leads(), 'stats'],
      })
      
      success('Lead created successfully')
    },
    
    // If mutation fails, rollback
    onError: (err, newLead, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData<Lead[]>(
          queryKeys.leadsList(),
          context.previousLeads
        )
      }
      error('Failed to create lead', err.message)
    },
  })
}

// Update lead mutation
export function useUpdateLead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async ({
      leadId,
      updates,
    }: {
      leadId: string
      updates: Partial<Lead>
    }) => {
      const headers = await getAuthHeaders()
      return queryFn<Lead>(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
    },
    
    // Optimistic update
    onMutate: async ({ leadId, updates }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.leadById(leadId) })
      
      // Snapshot previous values
      const previousLead = queryClient.getQueryData<Lead>(
        queryKeys.leadById(leadId)
      )
      const previousLeads = queryClient.getQueryData<Lead[]>(
        queryKeys.leadsList()
      )
      
      // Update single lead
      if (previousLead) {
        queryClient.setQueryData<Lead>(queryKeys.leadById(leadId), {
          ...previousLead,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }
      
      // Update in list
      queryClient.setQueryData<Lead[]>(queryKeys.leadsList(), (old) => {
        if (!old) return old
        
        return old.map((lead) =>
          lead.id === leadId
            ? { ...lead, ...updates, updated_at: new Date().toISOString() }
            : lead
        )
      })
      
      return { previousLead, previousLeads }
    },
    
    onError: (err, { leadId }, context) => {
      // Rollback on error
      if (context?.previousLead) {
        queryClient.setQueryData(queryKeys.leadById(leadId), context.previousLead)
      }
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leadsList(), context.previousLeads)
      }
      error('Failed to update lead', err.message)
    },
    
    onSuccess: () => {
      success('Lead updated successfully')
    },
    
    onSettled: (_, __, { leadId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.leadById(leadId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsList() })
    },
  })
}

// Delete lead mutation
export function useDeleteLead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (leadId: string) => {
      const headers = await getAuthHeaders()
      return queryFn(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers,
      })
    },
    
    // Optimistic update
    onMutate: async (leadId) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsList() })
      
      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leadsList())
      
      // Remove from list
      queryClient.setQueryData<Lead[]>(queryKeys.leadsList(), (old) => {
        if (!old) return old
        return old.filter((lead) => lead.id !== leadId)
      })
      
      return { previousLeads }
    },
    
    onError: (err, leadId, context) => {
      // Rollback
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leadsList(), context.previousLeads)
      }
      error('Failed to delete lead', err.message)
    },
    
    onSuccess: () => {
      success('Lead deleted successfully')
    },
    
    onSettled: () => {
      queryClient.invalidateQueries(invalidateQueries.leads())
    },
  })
}