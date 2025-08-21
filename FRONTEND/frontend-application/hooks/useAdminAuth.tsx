"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useAdminAuth() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side after mounting
    if (!mounted) return

    async function checkAdminAccess() {
      try {
        console.log('[useAdminAuth] Starting admin check...')
        
        // Get admin token from localStorage (for admin dashboard)
        const adminToken = localStorage.getItem('admin_token')
        const adminUser = localStorage.getItem('admin_user')
        // Fallback to regular auth token if no admin token
        const authToken = adminToken || localStorage.getItem('auth_token')
        const authUser = adminUser || localStorage.getItem('auth_user')
        
        console.log('[useAdminAuth] Admin token found:', !!adminToken)
        console.log('[useAdminAuth] Auth token found:', !!authToken)
        console.log('[useAdminAuth] Auth user found:', !!authUser)
        
        if (!authToken) {
          console.log('[useAdminAuth] No auth token found, redirecting to admin login')
          setError('Not authenticated')
          setLoading(false)
          router.push('/admin/login')
          return
        }

        // Parse user data if available
        if (authUser) {
          try {
            const user = JSON.parse(authUser)
            console.log('[useAdminAuth] User email:', user.email)
          } catch (e) {
            console.error('[useAdminAuth] Error parsing user data:', e)
          }
        }

        // Check admin access via API
        console.log('[useAdminAuth] Checking admin access via API...')
        const response = await fetch(`${API_BASE_URL}/api/admin/ai-analytics/summary`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('[useAdminAuth] API response status:', response.status)

        if (response.ok) {
          console.log('[useAdminAuth] ✅ Admin access confirmed')
          setIsAdmin(true)
          setError(null)
        } else if (response.status === 403) {
          console.log('[useAdminAuth] ❌ User lacks admin privileges')
          setIsAdmin(false)
          setError('You need admin privileges to access this page. Please contact your administrator.')
        } else if (response.status === 401) {
          console.log('[useAdminAuth] ❌ Authentication failed, token may be expired')
          setIsAdmin(false)
          setError('Authentication failed. Please sign in again.')
          // Clear invalid token
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          router.push('/admin/login')
        } else {
          console.error('[useAdminAuth] Unexpected response:', response.status)
          setIsAdmin(false)
          setError('Failed to verify admin access')
        }
      } catch (err) {
        console.error('[useAdminAuth] Error checking admin access:', err)
        setIsAdmin(false)
        setError('Failed to verify admin access')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [router, mounted])

  return { isAdmin, loading, error }
}