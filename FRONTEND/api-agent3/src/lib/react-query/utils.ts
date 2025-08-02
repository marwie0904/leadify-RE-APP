import { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { apiCall } from '@/lib/api'
import { ApiError } from './types'

// Base query function wrapper
export async function queryFn<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await apiCall(endpoint, options)
    return response as T
  } catch (error) {
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'An error occurred',
      details: error,
    }
    throw apiError
  }
}

// Type-safe query options builder
export function buildQueryOptions<
  TData = unknown,
  TError = ApiError,
  TSelect = TData
>(
  options: Omit<
    UseQueryOptions<TData, TError, TSelect>,
    'queryKey' | 'queryFn'
  > = {}
): Omit<UseQueryOptions<TData, TError, TSelect>, 'queryKey' | 'queryFn'> {
  return {
    retry: 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  }
}

// Type-safe mutation options builder
export function buildMutationOptions<
  TData = unknown,
  TError = ApiError,
  TVariables = void,
  TContext = unknown
>(
  options: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationFn'
  > = {}
): Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
> {
  return {
    retry: 1,
    ...options,
  }
}

// Helper for building query keys
export const queryKeys = {
  all: ['api'] as const,
  
  // User queries
  user: () => [...queryKeys.all, 'user'] as const,
  userById: (id: string) => [...queryKeys.user(), id] as const,
  userProfile: () => [...queryKeys.user(), 'profile'] as const,
  
  // Conversations queries
  conversations: () => [...queryKeys.all, 'conversations'] as const,
  conversationsList: (filters?: Record<string, any>) =>
    [...queryKeys.conversations(), 'list', filters] as const,
  conversationById: (id: string) => [...queryKeys.conversations(), id] as const,
  conversationMessages: (id: string) =>
    [...queryKeys.conversations(), id, 'messages'] as const,
  
  // Leads queries
  leads: () => [...queryKeys.all, 'leads'] as const,
  leadsList: (filters?: Record<string, any>) =>
    [...queryKeys.leads(), 'list', filters] as const,
  leadById: (id: string) => [...queryKeys.leads(), id] as const,
  
  // Analytics queries
  analytics: () => [...queryKeys.all, 'analytics'] as const,
  analyticsDashboard: () => [...queryKeys.analytics(), 'dashboard'] as const,
  analyticsReports: (type: string) =>
    [...queryKeys.analytics(), 'reports', type] as const,
  
  // Agents queries
  agents: () => [...queryKeys.all, 'agents'] as const,
  agentsList: () => [...queryKeys.agents(), 'list'] as const,
  agentById: (id: string) => [...queryKeys.agents(), id] as const,
}

// Cache invalidation helpers
export const invalidateQueries = {
  user: () => ({ queryKey: queryKeys.user() }),
  conversations: () => ({ queryKey: queryKeys.conversations() }),
  conversationById: (id: string) => ({
    queryKey: queryKeys.conversationById(id),
  }),
  leads: () => ({ queryKey: queryKeys.leads() }),
  leadById: (id: string) => ({ queryKey: queryKeys.leadById(id) }),
  analytics: () => ({ queryKey: queryKeys.analytics() }),
  agents: () => ({ queryKey: queryKeys.agents() }),
  agentById: (id: string) => ({ queryKey: queryKeys.agentById(id) }),
}