import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { apiCall } from '@/lib/api'
import { migrateEndpoint } from '@/lib/api/migration-helper'
import { useNotificationStore } from '@/src/stores/notification-store'
import type { 
  CreateLeadData, 
  EnhancedLead,
  UpdateBANTData,
  UpdateStatusData
} from '@/lib/validation/schemas'

export function useCreateLead() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const endpoint = migrateEndpoint('/api/leads')
      const headers = await getAuthHeaders()
      
      console.log('[Create Lead] Sending request:', {
        endpoint,
        data: {
          ...data,
          contactInfo: { ...data.contactInfo, email: '***@***' } // Log safely
        }
      })

      const response = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      })
      
      console.log('[Create Lead] Response received:', response)
      return response
    },
    
    // Optimistic update
    onMutate: async (newLeadData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      
      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(['leads'])
      
      // Create optimistic lead object
      const optimisticLead: Partial<EnhancedLead> = {
        id: `temp-${Date.now()}`, // Temporary ID
        contactInfo: newLeadData.contactInfo,
        source: newLeadData.source,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: newLeadData.notes,
        // Add initial BANT if provided
        ...(newLeadData.initialBANT && {
          bantScore: {
            budget: {
              score: newLeadData.initialBANT.budget,
              confidence: 0.5,
            },
            authority: {
              score: newLeadData.initialBANT.authority,
              confidence: 0.5,
            },
            need: {
              score: newLeadData.initialBANT.need,
              confidence: 0.5,
            },
            timeline: {
              score: newLeadData.initialBANT.timeline,
              confidence: 0.5,
            },
            totalScore: Math.round(
              (newLeadData.initialBANT.budget * 0.3 +
               newLeadData.initialBANT.authority * 0.25 +
               newLeadData.initialBANT.need * 0.25 +
               newLeadData.initialBANT.timeline * 0.2) * 10
            ),
            lastUpdated: new Date().toISOString(),
            updatedBy: 'current_user',
          }
        })
      }
      
      // Optimistically update the list
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old) return { leads: [optimisticLead] }
        return {
          ...old,
          leads: [optimisticLead, ...(old.leads || [])]
        }
      })
      
      return { previousLeads }
    },
    
    // Handle success
    onSuccess: (data) => {
      console.log('[Create Lead] Success:', data)
      
      // Invalidate and refetch affected queries
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      
      // Track analytics if available
      if (typeof window !== 'undefined' && 'analytics' in window) {
        // @ts-ignore - analytics might be available globally
        window.analytics?.track?.('lead_created', {
          leadId: data.lead?.id,
          source: data.source?.channel,
          hasInitialBANT: !!data.initialBANT,
        })
      }
      
      success('Lead created successfully!')
    },
    
    // If mutation fails, rollback
    onError: (err, newLeadData, context) => {
      console.error('[Create Lead] Error:', err)
      
      // If the mutation fails, use the context to roll back
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      
      error('Failed to create lead', err.message)
    },

    onSettled: () => {
      // Always refetch after error or success to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ['leads'] })
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

// Update BANT Score mutation
export function useUpdateBANTScore() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()

  return useMutation({
    mutationFn: async ({ leadId, ...scores }: UpdateBANTData) => {
      const endpoint = migrateEndpoint(`/api/leads/${leadId}/bant-score`)
      const headers = await getAuthHeaders()

      console.log('[Update BANT] Sending request:', { endpoint, leadId, scores })

      return apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(scores),
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      })
    },

    onMutate: async ({ leadId, ...scores }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['leads'])

      // Calculate total score
      const totalScore = Math.round(
        (scores.budget * 0.3 +
         scores.authority * 0.25 +
         scores.need * 0.25 +
         scores.timeline * 0.2) * 10
      )

      // Optimistically update
      queryClient.setQueryData(['leads'], (old: any) => ({
        ...old,
        leads: old?.leads?.map((lead: any) => 
          lead.id === leadId 
            ? { 
                ...lead, 
                bantScore: { 
                  budget: { score: scores.budget, confidence: scores.confidence || 0.8 },
                  authority: { score: scores.authority, confidence: scores.confidence || 0.8 },
                  need: { score: scores.need, confidence: scores.confidence || 0.8 },
                  timeline: { score: scores.timeline, confidence: scores.confidence || 0.8 },
                  totalScore,
                  lastUpdated: new Date().toISOString(),
                  updatedBy: 'current_user'
                }
              }
            : lead
        ) || []
      }))

      return { previousData }
    },

    onError: (err, variables, context) => {
      console.error('[Update BANT] Error:', err)
      
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['leads'], context.previousData)
      }
      
      error('Failed to update BANT score', err.message)
    },

    onSuccess: (data, { leadId }) => {
      console.log('[Update BANT] Success:', data)
      success('BANT score updated successfully!')
      
      // Track analytics
      if (typeof window !== 'undefined' && 'analytics' in window) {
        // @ts-ignore
        window.analytics?.track?.('bant_score_updated', { leadId })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// Update Lead Status mutation
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()

  return useMutation({
    mutationFn: async ({ leadId, status, reason }: UpdateStatusData) => {
      const endpoint = migrateEndpoint(`/api/leads/${leadId}/status`)
      const headers = await getAuthHeaders()

      console.log('[Update Status] Sending request:', { endpoint, leadId, status, reason })

      return apiCall(endpoint, {
        method: 'PUT', 
        body: JSON.stringify({ status, reason }),
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      })
    },

    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousData = queryClient.getQueryData(['leads'])

      // Update lead status optimistically
      queryClient.setQueryData(['leads'], (old: any) => ({
        ...old,
        leads: old?.leads?.map((lead: any) =>
          lead.id === leadId 
            ? { ...lead, status, updatedAt: new Date().toISOString() } 
            : lead
        ) || []
      }))

      return { previousData }
    },

    onError: (err, variables, context) => {
      console.error('[Update Status] Error:', err)
      
      if (context?.previousData) {
        queryClient.setQueryData(['leads'], context.previousData)
      }
      
      error('Failed to update lead status', err.message)
    },

    onSuccess: (data, { leadId, status }) => {
      console.log('[Update Status] Success:', data)
      success(`Lead status updated to ${status}`)
      
      // Analytics
      if (typeof window !== 'undefined' && 'analytics' in window) {
        // @ts-ignore
        window.analytics?.track?.('lead_status_updated', { leadId, status })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    },
  })
}