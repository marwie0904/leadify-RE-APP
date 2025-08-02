import { QueryClient } from '@tanstack/react-query'
import { queryFn, queryKeys } from './utils'
import type { User, Lead, Conversation, Agent, Analytics } from './types'

// Prefetch helpers for route-based prefetching
export const prefetchHelpers = {
  // Prefetch dashboard data
  async dashboard(queryClient: QueryClient, getAuthHeaders: () => Promise<any>) {
    const headers = await getAuthHeaders()
    
    return Promise.all([
      // User profile
      queryClient.prefetchQuery({
        queryKey: queryKeys.userProfile(),
        queryFn: () => queryFn<User>('/api/users/profile', { headers }),
      }),
      
      // Dashboard analytics
      queryClient.prefetchQuery({
        queryKey: queryKeys.analyticsDashboard(),
        queryFn: () => queryFn<Analytics>('/api/analytics/dashboard', { headers }),
      }),
      
      // Recent conversations
      queryClient.prefetchQuery({
        queryKey: queryKeys.conversationsList({ limit: 5 }),
        queryFn: () => queryFn<Conversation[]>('/api/conversations?limit=5', { headers }),
      }),
    ])
  },
  
  // Prefetch conversations page
  async conversations(queryClient: QueryClient, getAuthHeaders: () => Promise<any>) {
    const headers = await getAuthHeaders()
    
    return queryClient.prefetchQuery({
      queryKey: queryKeys.conversationsList(),
      queryFn: () => queryFn<Conversation[]>('/api/conversations', { headers }),
    })
  },
  
  // Prefetch leads page
  async leads(queryClient: QueryClient, getAuthHeaders: () => Promise<any>) {
    const headers = await getAuthHeaders()
    
    return Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.leadsList(),
        queryFn: () => queryFn<Lead[]>('/api/leads', { headers }),
      }),
      
      queryClient.prefetchQuery({
        queryKey: [...queryKeys.leads(), 'stats'],
        queryFn: () => queryFn('/api/leads/stats', { headers }),
      }),
    ])
  },
  
  // Prefetch agents page
  async agents(queryClient: QueryClient, getAuthHeaders: () => Promise<any>) {
    const headers = await getAuthHeaders()
    
    return queryClient.prefetchQuery({
      queryKey: queryKeys.agentsList(),
      queryFn: () => queryFn<Agent[]>('/api/agents', { headers }),
    })
  },
  
  // Prefetch analytics page
  async analytics(queryClient: QueryClient, getAuthHeaders: () => Promise<any>) {
    const headers = await getAuthHeaders()
    
    return Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.analyticsDashboard(),
        queryFn: () => queryFn<Analytics>('/api/analytics/dashboard', { headers }),
      }),
      
      queryClient.prefetchQuery({
        queryKey: queryKeys.analyticsReports('revenue'),
        queryFn: () => queryFn('/api/analytics/revenue', { headers }),
      }),
    ])
  },
}

// Hook for prefetching on route hover
export function usePrefetchRoute() {
  const queryClient = new QueryClient()
  
  return {
    prefetchDashboard: () => {
      // Implementation would need auth context
      console.log('Prefetching dashboard data...')
    },
    
    prefetchConversations: () => {
      console.log('Prefetching conversations data...')
    },
    
    prefetchLeads: () => {
      console.log('Prefetching leads data...')
    },
    
    prefetchAgents: () => {
      console.log('Prefetching agents data...')
    },
    
    prefetchAnalytics: () => {
      console.log('Prefetching analytics data...')
    },
  }
}