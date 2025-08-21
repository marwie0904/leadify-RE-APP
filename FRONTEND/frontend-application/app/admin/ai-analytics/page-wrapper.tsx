"use client"

import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Lock } from "lucide-react"
import { useRouter } from 'next/navigation'
import EnhancedAIAnalyticsPage from './page-enhanced'

export default function AIAnalyticsPageWrapper() {
  const { isAdmin, loading, error } = useAdminAuth()
  const router = useRouter()
  
  console.log('[AI Analytics Wrapper] Auth state:', { isAdmin, loading, error })

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying admin access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Admin Access Required</AlertTitle>
              <AlertDescription className="mt-2">
                {error}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">To access AI Analytics, you need:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>To be added to the dev_members table</li>
                  <li>Have an active status</li>
                  <li>Have admin, developer, or super_admin role</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Ask your administrator to run:</p>
                <pre className="text-xs bg-background p-2 rounded mt-2 overflow-x-auto">
{`INSERT INTO public.dev_members (
  user_id, email, full_name, role, 
  permissions, is_active
) VALUES (
  'your-user-id', 'your-email@example.com',
  'Your Name', 'developer',
  ARRAY['read', 'write', 'admin'], true
)`}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <p className="text-center">You don't have permission to view this page.</p>
              <Button onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is admin, render the analytics page
  console.log('[AI Analytics Wrapper] User is admin, rendering EnhancedAIAnalyticsPage...')
  return <EnhancedAIAnalyticsPage />
}