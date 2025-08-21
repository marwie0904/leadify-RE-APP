import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
}

export function useDashboardSummary() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getDashboardSummary(headers)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}