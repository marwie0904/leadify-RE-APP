import { QueryClient } from '@tanstack/react-query'

// Configure QueryClient with sensible defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Show error notifications for failed mutations
      onError: (error) => {
        console.error('Mutation error:', error)
      },
    },
  },
})

// Helper function for creating query keys with proper typing
export function createQueryKey<T extends readonly unknown[]>(keys: T): T {
  return keys
}