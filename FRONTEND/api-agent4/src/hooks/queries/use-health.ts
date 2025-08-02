import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { apiCall } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { migrateEndpoint } from '@/lib/api/migration-helper'
import { validateApiResponse, healthCheckSchema, type HealthCheckResult } from '@/lib/validation/schemas'

/**
 * Health check query hook for monitoring system status
 * Includes automatic retries and failure handling
 */
export function useHealthCheck(options: UseQueryOptions<HealthCheckResult> = {}) {
  const { getAuthHeaders } = useAuth()

  return useQuery<HealthCheckResult>({
    queryKey: ['health'],
    queryFn: async () => {
      const endpoint = migrateEndpoint('/api/health')
      const headers = await getAuthHeaders()
      
      console.log('[Health Check] Fetching from:', endpoint)

      const response = await apiCall(endpoint, {
        headers,
      })
      
      // Validate response against schema
      const validatedResponse = validateApiResponse(healthCheckSchema, response)
      
      console.log('[Health Check] Status:', validatedResponse.status)
      return validatedResponse
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Retry up to 3 times for health checks
      if (failureCount < 3) {
        console.log(`[Health Check] Retry attempt ${failureCount + 1}`)
        return true
      }
      return false
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  })
}

/**
 * Readiness check query hook 
 * Used to determine if the system is ready to serve traffic
 */
export function useReadinessCheck(options: UseQueryOptions = {}) {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: ['health', 'ready'],
    queryFn: async () => {
      const endpoint = migrateEndpoint('/api/health/ready')
      const headers = await getAuthHeaders()
      
      console.log('[Readiness Check] Fetching from:', endpoint)

      const response = await apiCall(endpoint, {
        headers,
      })
      
      console.log('[Readiness Check] Response:', response)
      return response
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // 30 seconds
    retry: 2,
    ...options
  })
}

/**
 * Liveness check query hook
 * Used to determine if the system is alive and responding
 */
export function useLivenessCheck(options: UseQueryOptions = {}) {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: ['health', 'live'],
    queryFn: async () => {
      const endpoint = migrateEndpoint('/api/health/live')
      const headers = await getAuthHeaders()
      
      console.log('[Liveness Check] Fetching from:', endpoint)

      const response = await apiCall(endpoint, {
        headers,
      })
      
      console.log('[Liveness Check] Response:', response)
      return response
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 20000, // 20 seconds
    retry: 1, // Minimal retry for liveness
    ...options
  })
}

/**
 * Combined health status hook that aggregates all health endpoints
 * Useful for dashboard health widgets
 */
export function useSystemHealth() {
  const healthCheck = useHealthCheck()
  const readinessCheck = useReadinessCheck()
  const livenessCheck = useLivenessCheck()

  // Determine overall system status
  const overallStatus = (() => {
    if (healthCheck.isError || readinessCheck.isError || livenessCheck.isError) {
      return 'unhealthy'
    }
    
    if (healthCheck.isLoading || readinessCheck.isLoading || livenessCheck.isLoading) {
      return 'checking'
    }
    
    // Check individual statuses
    const healthStatus = healthCheck.data?.status
    if (healthStatus === 'unhealthy') return 'unhealthy'
    if (healthStatus === 'degraded') return 'degraded'
    
    return 'healthy'
  })()

  return {
    overallStatus,
    health: healthCheck,
    readiness: readinessCheck,
    liveness: livenessCheck,
    
    // Convenience properties
    isHealthy: overallStatus === 'healthy',
    isDegraded: overallStatus === 'degraded',
    isUnhealthy: overallStatus === 'unhealthy',
    isChecking: overallStatus === 'checking',
    
    // Last updated timestamp
    lastChecked: Math.max(
      healthCheck.dataUpdatedAt || 0,
      readinessCheck.dataUpdatedAt || 0,
      livenessCheck.dataUpdatedAt || 0
    ),
    
    // Error aggregation
    errors: [
      healthCheck.error,
      readinessCheck.error,
      livenessCheck.error
    ].filter(Boolean),
  }
}