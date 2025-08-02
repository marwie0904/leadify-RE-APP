'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error
    errorInfo: React.ErrorInfo
    resetError: () => void
  }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error details
    this.setState({
      errorInfo,
    })

    // Here you would typically log to an error reporting service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        )
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We're sorry, but an unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="font-mono text-sm">
                  {this.state.error.message}
                </AlertDescription>
              </Alert>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-gray-100 p-2 text-xs dark:bg-gray-800">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.resetError} variant="default">
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

    return this.props.children
  }
}