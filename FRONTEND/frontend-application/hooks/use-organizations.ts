import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface OrganizationSummary {
  totalOrganizations: number
  totalUsers: number
  totalLeadsMonth: number
  totalConversationsMonth: number
  totalTokensMonth: number
}

interface LeadClassification {
  priority: number
  hot: number
  warm: number
  cold: number
  qualified: number
  unclassified: number
}

interface OrganizationMetrics {
  monthly: {
    users: number
    leads: number
    conversations: number
    tokens: number
  }
  lifetime: {
    leads: number
    conversations: number
    tokens: number
    spent: string
  }
}

interface Organization {
  id: string
  name: string
  plan: string
  createdAt: string
  metrics: OrganizationMetrics
  leadClassification: LeadClassification
  status: 'active' | 'inactive'
}

interface OrganizationsResponse {
  summary: OrganizationSummary
  organizations: Organization[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useOrganizations(page = 1, limit = 20, search = '') {
  const [data, setData] = useState<OrganizationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = useCallback(async () => {
    // Check for admin token first
    const adminToken = localStorage.getItem('admin_token')
    const authToken = localStorage.getItem('auth_token')
    const token = adminToken || authToken
    
    if (!token) {
      setError('No authentication token available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizations?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.')
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        }
        throw new Error(`Failed to fetch organizations: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch organizations')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  return {
    data,
    loading,
    error,
    refetch: fetchOrganizations,
  }
}

interface OrganizationDetail {
  id: string
  name: string
  plan: string
  createdAt: string
  metrics: {
    totalTokenUsage: number
    avgDailyTokens: number
    totalLeads: number
    qualifiedLeads: number
    openConversations: number
    conversionRate: number
    totalCost: string
  }
  tokenUsageByType: Array<{
    type: string
    tokens: number
    cost: number
    percentage: string
  }>
  users: Array<{
    id: string
    email: string
    name: string
    role: string
  }>
  tokenUsageTrend: Array<{
    date: string
    tokens: number
    cost: string
  }>
  leadClassification: LeadClassification
}

export function useOrganizationDetail(organizationId: string, timeRange = '30d') {
  const [data, setData] = useState<OrganizationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizationDetail = useCallback(async () => {
    // Check for admin token first
    const adminToken = localStorage.getItem('admin_token')
    const authToken = localStorage.getItem('auth_token')
    const token = adminToken || authToken
    
    if (!token || !organizationId) {
      setError('No authentication token or organization ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        timeRange,
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizations/${organizationId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.')
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        }
        if (response.status === 404) {
          throw new Error('Organization not found.')
        }
        throw new Error(`Failed to fetch organization details: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data.organization)
      } else {
        throw new Error(result.error || 'Failed to fetch organization details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [organizationId, timeRange])

  useEffect(() => {
    fetchOrganizationDetail()
  }, [fetchOrganizationDetail])

  return {
    data,
    loading,
    error,
    refetch: fetchOrganizationDetail,
  }
}

interface OrganizationAnalytics {
  dateRange: {
    start: string
    end: string
  }
  conversionMetrics: {
    totalLeads: number
    engagedLeads: number
    qualifiedLeads: number
    hotLeads: number
    engagementRate: string
    qualificationRate: string
    conversionFunnel: Array<{
      stage: string
      value: number
      percentage: string
    }>
  }
  leadMetrics: {
    byClassification: LeadClassification
    trend: any[]
  }
  conversationMetrics: {
    total: number
    active: number
    completed: number
    handoff: number
    avgDuration: number
  }
  tokenUsageTrend: Array<{
    date: string
    tokens: number
    cost: string
    requests: number
    avgResponseTime: number
  }>
  performanceMetrics: {
    totalTokens: number
    totalRequests: number
    avgResponseTime: number
    avgTokensPerRequest: number
    responseTimeP95: number
    errorRate: number
  }
  userActivity: {
    totalUsers: number
    activeUsers: number
    admins: number
    members: number
  }
}

export function useOrganizationAnalytics(
  organizationId: string,
  startDate?: string,
  endDate?: string
) {
  const [data, setData] = useState<OrganizationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    // Check for admin token first
    const adminToken = localStorage.getItem('admin_token')
    const authToken = localStorage.getItem('auth_token')
    const token = adminToken || authToken
    
    if (!token || !organizationId) {
      setError('No authentication token or organization ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizations/${organizationId}/analytics?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.')
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        }
        if (response.status === 404) {
          throw new Error('Organization not found.')
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data.analytics)
      } else {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [organizationId, startDate, endDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  }
}