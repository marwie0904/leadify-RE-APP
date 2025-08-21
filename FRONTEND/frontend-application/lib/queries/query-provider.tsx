'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import ReactQueryDevtools to avoid SSR issues
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
)

// Configure default options for React Query
const defaultQueryOptions = {
  queries: {
    // Stale time: 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache time: 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry configuration
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      // Retry up to 3 times
      return failureCount < 3
    },
    retryDelay: (attemptIndex: number) => {
      // Exponential backoff with jitter
      return Math.min(1000 * 2 ** attemptIndex + Math.random() * 1000, 30000)
    },
    // Refetch on window focus
    refetchOnWindowFocus: false,
    // Refetch on reconnect
    refetchOnReconnect: 'always',
  },
  mutations: {
    // Retry configuration for mutations
    retry: 1,
    retryDelay: 1000,
  },
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance for each request
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: defaultQueryOptions,
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}