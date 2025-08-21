import { useState, useEffect } from 'react'
import { apiCall } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"
import { BANTConfig, transformDBToFrontend, transformFrontendToDB } from '@/utils/bant-transform'

interface UseBANTConfigResult {
  config: BANTConfig | null
  loading: boolean
  error: string | null
  fetchConfig: () => Promise<void>
  saveConfig: (config: BANTConfig) => Promise<void>
  deleteConfig: () => Promise<void>
}

export function useBANTConfig(agentId: string): UseBANTConfigResult {
  const { getAuthHeaders } = useAuth()
  const [config, setConfig] = useState<BANTConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    if (!agentId || agentId === '') {
      setConfig(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      
      // Try to fetch config - 404 is expected if no config exists
      let response
      try {
        response = await apiCall(`/api/agents/${agentId}/bant-config`, {
          method: 'GET',
          headers
        })
      } catch (err: any) {
        // If it's a 404, return the error details as response
        if (err?.status === 404 && err?.details) {
          response = err.details
        } else {
          throw err
        }
      }
      
      // Check if response is successful
      if (response?.success === false && response?.error?.code === 'NOT_FOUND') {
        // No config exists yet, this is normal
        setConfig(null)
        setError(null)
        return
      }
      
      if (response && response.data && response.data.config) {
        // Transform the database format to match frontend expectations
        const transformedConfig = transformDBToFrontend(response.data.config)
        setConfig(transformedConfig)
      } else if (response && response.config) {
        setConfig(response.config)
      } else {
        // No config exists yet, this is normal
        setConfig(null)
      }
    } catch (err: any) {
      // Handle 404 as a normal case (no config exists)
      if (err?.status === 404 || err?.details?.error?.code === 'NOT_FOUND' || 
          (err?.message && err.message.includes('404')) ||
          (err?.details && typeof err.details === 'object' && err.details.error?.code === 'NOT_FOUND')) {
        setConfig(null)
        setError(null) // Clear any error since this is expected
        return
      }
      console.error('Error fetching BANT config:', {
        error: err,
        message: err?.message,
        status: err?.status,
        details: err?.details,
        agentId
      })
      setError(err instanceof Error ? err.message : 'Failed to fetch BANT configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (newConfig: BANTConfig) => {
    if (!agentId) {
      throw new Error('Agent ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate weights total for validation
      const totalWeight = newConfig.budget_weight + newConfig.authority_weight + 
                         newConfig.need_weight + newConfig.timeline_weight + 
                         newConfig.contact_weight

      if (totalWeight !== 100) {
        throw new Error('Weights must total exactly 100%')
      }

      // Validate thresholds
      if (newConfig.priority_threshold <= newConfig.hot_threshold || 
          newConfig.hot_threshold <= newConfig.warm_threshold) {
        throw new Error('Thresholds must be in descending order: Priority > Hot > Warm')
      }

      const headers = await getAuthHeaders()
      
      // Transform the frontend format to match database expectations
      const dbConfig = transformFrontendToDB(newConfig)
      
      const response = await apiCall(`/api/agents/${agentId}/bant-config`, {
        method: 'POST',
        headers,
        body: dbConfig
      })

      if (response?.data?.config) {
        // Don't set the raw response, let fetchConfig handle the transformation
        // setConfig(response.data.config)
      } else if (response?.config) {
        // setConfig(response.config)
      } else {
        throw new Error('Failed to save BANT configuration - no config returned')
      }

      // Refresh to get the transformed config
      await fetchConfig()
    } catch (err) {
      console.error('Error saving BANT config:', err)
      setError(err instanceof Error ? err.message : 'Failed to save BANT configuration')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteConfig = async () => {
    if (!agentId) {
      throw new Error('Agent ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      await apiCall(`/api/agents/${agentId}/bant-config`, {
        method: 'DELETE',
        headers
      })

      setConfig(null)
    } catch (err) {
      console.error('Error deleting BANT config:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete BANT configuration')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchConfig()
    }
  }, [agentId])

  return {
    config,
    loading,
    error,
    fetchConfig,
    saveConfig,
    deleteConfig
  }
}