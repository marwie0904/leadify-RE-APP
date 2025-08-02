import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, buildQueryOptions } from '@/src/lib/react-query/utils'
import { Lead, LeadFilters, PaginatedResponse } from '@/src/lib/react-query/types'

interface UseInfiniteLeadsOptions extends LeadFilters {
  limit?: number
}

export function useInfiniteLeads(options: UseInfiniteLeadsOptions = {}) {
  const { user, getAuthHeaders } = useAuth()
  const { limit = 20, ...filters } = options
  
  return useInfiniteQuery({
    queryKey: ['leads', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const headers = await getAuthHeaders()
      const queryParams = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit),
      })
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
      
      const endpoint = `/api/leads?${queryParams.toString()}`
      return queryFn<PaginatedResponse<Lead>>(endpoint, { headers })
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    getPreviousPageParam: (firstPage) => {
      if (firstPage.page > 1) {
        return firstPage.page - 1
      }
      return undefined
    },
    enabled: !!user,
    ...buildQueryOptions<PaginatedResponse<Lead>>({
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  })
}

// Hook for virtual scrolling with leads
export function useVirtualizedLeads(options: UseInfiniteLeadsOptions = {}) {
  const query = useInfiniteLeads(options)
  
  // Flatten all pages into a single array for virtualization
  const allLeads = query.data?.pages.flatMap((page) => page.data) ?? []
  
  return {
    ...query,
    leads: allLeads,
    totalCount: query.data?.pages[0]?.total ?? 0,
  }
}