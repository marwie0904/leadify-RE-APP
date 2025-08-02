'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { errorLogger } from '@/lib/error-logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to error reporting service
    errorLogger.logWithContext(error, {
      page: 'error.tsx',
      digest: error.digest,
      type: 'runtime-error'
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
          <CardDescription className="text-base">
            We encountered an unexpected error while processing your request.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="font-mono text-sm">
                {error.message || 'An unexpected error occurred'}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Error ID: {error.digest}
                </p>
              )}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              What you can do:
            </h4>
            <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>• Try refreshing the page</li>
              <li>• Go back to the previous page</li>
              <li>• Return to the dashboard</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              onClick={() => reset()}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => router.back()}
              className="flex-1"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
            variant="secondary"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}