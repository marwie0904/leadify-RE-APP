import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, buildQueryOptions } from '@/src/lib/react-query/utils'
import { Analytics } from '@/src/lib/react-query/types'

interface DateRange {
  from: Date | string
  to: Date | string
}

// Fetch dashboard analytics
export function useDashboardAnalytics(dateRange?: DateRange) {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: [...queryKeys.analyticsDashboard(), dateRange],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('from', String(dateRange.from))
        queryParams.append('to', String(dateRange.to))
      }
      
      const endpoint = `/api/analytics/dashboard${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`
      
      return queryFn<Analytics>(endpoint, { headers })
    },
    enabled: !!user,
    ...buildQueryOptions<Analytics>({
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  })
}

// Fetch revenue analytics
export function useRevenueAnalytics(period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly') {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.analyticsReports('revenue'),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{
        total: number
        growth: number
        chart: Array<{ date: string; revenue: number }>
        byProduct: Array<{ product: string; revenue: number }>
      }>(`/api/analytics/revenue?period=${period}`, { headers })
    },
    enabled: !!user,
    ...buildQueryOptions({
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),
  })
}

// Fetch performance analytics
export function usePerformanceAnalytics() {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.analyticsReports('performance'),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{
        averageResponseTime: string
        resolutionRate: number
        customerSatisfaction: number
        agentUtilization: number
        trends: Array<{
          date: string
          responseTime: number
          satisfaction: number
        }>
      }>('/api/analytics/performance', { headers })
    },
    enabled: !!user,
    ...buildQueryOptions({
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  })
}

// Fetch conversion funnel analytics
export function useConversionFunnel() {
  const { user, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.analyticsReports('funnel'),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<{
        stages: Array<{
          name: string
          count: number
          percentage: number
        }>
        overallConversion: number
      }>('/api/analytics/funnel', { headers })
    },
    enabled: !!user,
    ...buildQueryOptions({
      staleTime: 15 * 60 * 1000, // 15 minutes
    }),
  })
}