'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to error reporting service
    console.error('Global error:', error)
  }, [error])

  // This is a minimal error page that doesn't depend on any app components
  // since it replaces the root layout when there's an error
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Critical Application Error
              </h1>
              
              <p className="mb-6 text-gray-600">
                Something went seriously wrong. The application encountered a critical error.
              </p>

              <div className="mb-6 rounded-lg bg-red-50 p-4">
                <p className="text-sm font-mono text-red-800">
                  {error.message || 'Unknown error occurred'}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-red-600">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => reset()}
                  className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </button>
              </div>

              <p className="mt-6 text-xs text-gray-500">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}