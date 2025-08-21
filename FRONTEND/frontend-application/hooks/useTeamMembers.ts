import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'developer' | 'super_admin' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  invitedBy: string
  invitedAt: string
  acceptedAt: string | null
  lastActive: string | null
  permissions?: string[]
}

export interface TeamMembersResponse {
  success: boolean
  data: {
    members: TeamMember[]
    total: number
  }
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamMembers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token')
      const authToken = localStorage.getItem('auth_token')
      const token = adminToken || authToken
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to fetch team members')
      }

      const result: TeamMembersResponse = await response.json()
      
      if (result.success && result.data) {
        setTeamMembers(result.data.members)
      } else {
        throw new Error(result.message || 'Failed to fetch team members')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('[useTeamMembers] Error:', errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTeamMember = useCallback(async (memberId: string, updates: { role?: string; is_active?: boolean }) => {
    try {
      const adminToken = localStorage.getItem('admin_token')
      const authToken = localStorage.getItem('auth_token')
      const token = adminToken || authToken
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/team/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      )

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to update team member')
      }

      const result = await response.json()
      
      if (result.success) {
        // Refresh the team members list
        await fetchTeamMembers()
        toast.success('Team member updated successfully')
        return result.data
      } else {
        throw new Error(result.message || 'Failed to update team member')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('[useTeamMembers] Update error:', errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [fetchTeamMembers])

  useEffect(() => {
    fetchTeamMembers()
  }, [fetchTeamMembers])

  return {
    teamMembers,
    loading,
    error,
    refetch: fetchTeamMembers,
    updateTeamMember
  }
}