interface ErrorLogEntry {
  timestamp: string
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  userId?: string
  metadata?: Record<string, any>
}

class ErrorLogger {
  private queue: ErrorLogEntry[] = []
  private isOnline: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flushQueue()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  log(error: Error, errorInfo?: React.ErrorInfo, metadata?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      metadata,
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', entry)
    }

    // Add to queue
    this.queue.push(entry)

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushQueue()
    }
  }

  private async flushQueue() {
    if (this.queue.length === 0) return

    const errors = [...this.queue]
    this.queue = []

    try {
      // In a real app, you would send this to your error logging service
      // For now, we'll just log to console
      console.log('Would send errors to logging service:', errors)
      
      // Example of what you might do:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ errors })
      // })
    } catch (sendError) {
      // If sending fails, add back to queue
      this.queue.unshift(...errors)
      console.error('Failed to send error logs:', sendError)
    }
  }

  // Helper method to log with additional context
  logWithContext(error: Error, context: {
    component?: string
    action?: string
    userId?: string
    [key: string]: any
  }) {
    this.log(error, undefined, context)
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger()

// Helper function to determine error type
export function getErrorType(error: Error): 'network' | 'auth' | 'server' | 'client' {
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network'
  }
  
  if (message.includes('unauthorized') || message.includes('401') || message.includes('auth')) {
    return 'auth'
  }
  
  if (message.includes('500') || message.includes('server')) {
    return 'server'
  }
  
  return 'client'
}