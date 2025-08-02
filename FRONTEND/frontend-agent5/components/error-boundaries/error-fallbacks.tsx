'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Home, WifiOff, Lock, ServerCrash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorFallbackProps {
  error: Error
  errorInfo: React.ErrorInfo
  resetError: () => void
}

// Network Error Fallback
export function NetworkErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <WifiOff className="h-6 w-6 text-orange-500" />
            <CardTitle>Connection Problem</CardTitle>
          </div>
          <CardDescription>
            We're having trouble connecting to our servers. Please check your internet connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What you can try:</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Check your internet connection</li>
                <li>Refresh the page</li>
                <li>Try again in a few moments</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={resetError} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Authentication Error Fallback
export function AuthErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-yellow-500" />
            <CardTitle>Authentication Required</CardTitle>
          </div>
          <CardDescription>
            Your session may have expired. Please sign in again to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Why did this happen?</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Your session expired for security</li>
                <li>You were signed out on another device</li>
                <li>Your permissions have changed</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={() => window.location.href = '/auth'} className="flex-1">
            Sign In
          </Button>
          <Button onClick={resetError} variant="outline" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Server Error Fallback
export function ServerErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ServerCrash className="h-6 w-6 text-red-500" />
            <CardTitle>Server Error</CardTitle>
          </div>
          <CardDescription>
            Our servers encountered an error. We've been notified and are working on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Code: {(error as any).code || '500'}</AlertTitle>
            <AlertDescription>
              {error.message || 'An unexpected server error occurred'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={resetError} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Generic Component Error Fallback (for smaller components)
export function ComponentErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-200">
            Component Error
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            This component failed to load properly.
          </p>
          <Button
            onClick={resetError}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Reload Component
          </Button>
        </div>
      </div>
    </div>
  )
}