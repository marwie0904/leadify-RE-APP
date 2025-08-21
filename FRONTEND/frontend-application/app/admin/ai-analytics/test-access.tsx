"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function TestAccessPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testAccess() {
      try {
        // Get current session
        if (!supabase) {
          setSessionInfo({ error: 'Supabase not initialized' })
          setLoading(false)
          return
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setSessionInfo({ error: error.message })
        } else if (!session) {
          setSessionInfo({ error: 'No active session' })
        } else {
          setSessionInfo({
            userId: session.user.id,
            email: session.user.email,
            tokenPresent: !!session.access_token,
            tokenPreview: session.access_token ? `${session.access_token.substring(0, 20)}...` : 'None'
          })

          // Test API access
          try {
            const response = await fetch(`${API_BASE_URL}/api/admin/ai-analytics/summary`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            })

            const responseText = await response.text()
            let responseData = null
            
            try {
              responseData = JSON.parse(responseText)
            } catch {
              responseData = responseText
            }

            setApiTestResult({
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              data: responseData
            })
          } catch (apiError: any) {
            setApiTestResult({
              error: apiError.message
            })
          }
        }
      } catch (err: any) {
        setSessionInfo({ error: err.message })
      } finally {
        setLoading(false)
      }
    }

    testAccess()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Analytics Access Test</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(sessionInfo, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(apiTestResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">If you see a 403 error above, you need to be added to the dev_members table.</p>
            <p className="text-sm">Run this SQL in Supabase with your user ID from above:</p>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
{`INSERT INTO public.dev_members (
  user_id, email, full_name, role, permissions, is_active
) VALUES (
  'YOUR_USER_ID_FROM_ABOVE',
  'your-email@example.com',
  'Your Name',
  'developer',
  ARRAY['read', 'write', 'admin'],
  true
) ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role = 'developer',
  permissions = ARRAY['read', 'write', 'admin'];`}
            </pre>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/admin/ai-analytics'}>
                Go to AI Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}