"use client"

import { useEffect, useState } from 'react'
import { adminUsersAPI } from '@/lib/api/admin-users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestStatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const testStats = async () => {
    setLoading(true)
    setError(null)
    setStats(null)
    setLogs([])
    
    try {
      addLog('Starting stats fetch...')
      
      // Check Supabase session
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data: { session } } = await supabase.auth.getSession()
        addLog(`Supabase session exists: ${!!session}`)
        if (session) {
          addLog(`User email: ${session.user.email}`)
        }
      } else {
        addLog('Supabase not configured')
      }
      
      // Check localStorage token
      const localToken = localStorage.getItem('auth_token')
      addLog(`localStorage auth_token exists: ${!!localToken}`)
      
      // Fetch stats
      addLog('Calling adminUsersAPI.getStats()...')
      const statsData = await adminUsersAPI.getStats()
      addLog('Stats received successfully!')
      addLog(`Stats data: ${JSON.stringify(statsData)}`)
      
      setStats(statsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      addLog(`Error: ${errorMessage}`)
      setError(errorMessage)
      
      if (err instanceof Error) {
        console.error('Full error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testStats()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stats API Test Page</h1>
      
      <Button onClick={testStats} disabled={loading}>
        {loading ? 'Testing...' : 'Test Stats API'}
      </Button>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}

      {stats && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Stats Retrieved Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>Total Users: <strong>{stats.totalUsers}</strong></div>
              <div>Active Users: <strong>{stats.activeUsers}</strong></div>
              <div>Inactive Users: <strong>{stats.inactiveUsers}</strong></div>
              <div>Total Organizations: <strong>{stats.totalOrganizations}</strong></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
            {logs.join('\n')}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}