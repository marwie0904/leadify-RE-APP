/**
 * Advanced Error Boundary Component
 * 
 * Frontend UX-focused error boundary with:
 * - Progressive error recovery
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Mobile-first responsive design
 * - Performance monitoring
 * - User feedback collection
 * - Contextual help system
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  AlertTriangle, 
  Home, 
  RotateCcw, 
  HelpCircle, 
  MessageSquare,
  Wifi,
  WifiOff,
  Timer,
  ChevronDown
} from 'lucide-react'
import { UserFeedbackCollector } from './UserFeedbackCollector'
import { cn } from '@/lib/utils'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
  retryCountdown: number
  showFeedback: boolean
  showHelp: boolean
  errorId: string
  lastErrorTime: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRetry?: (retryCount: number) => void
  onFeedbackSubmit?: (feedback: any) => void
  maxRetries?: number
  enableRetry?: boolean
  showContextualHelp?: boolean
  supportTouchGestures?: boolean
  persistErrorState?: boolean
  trackPerformance?: boolean
  recoveryManager?: any
  className?: string
}

interface ErrorTypeConfig {
  title: string
  description: string
  primaryAction: string
  icon: React.ComponentType<any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoveryStrategies: string[]
}

const ERROR_TYPE_CONFIGS: Record<string, ErrorTypeConfig> = {
  network: {
    title: 'Connection Problem',
    description: 'Unable to connect to our servers. Please check your internet connection.',
    primaryAction: 'Try Again',
    icon: WifiOff,
    severity: 'medium',
    recoveryStrategies: ['retry', 'offline-mode', 'fallback']
  },
  authentication: {
    title: 'Authentication Required',
    description: 'Your session has expired. Please sign in again to continue.',
    primaryAction: 'Sign In Again',
    icon: AlertTriangle,
    severity: 'high',
    recoveryStrategies: ['redirect-login', 'refresh-token']
  },
  permission: {
    title: 'Access Denied',
    description: 'You don\'t have permission to access this resource.',
    primaryAction: 'Go Back',
    icon: AlertTriangle,
    severity: 'high',
    recoveryStrategies: ['redirect-home', 'contact-support']
  },
  validation: {
    title: 'Invalid Data',
    description: 'The information provided doesn\'t meet our requirements.',
    primaryAction: 'Fix Issues',
    icon: AlertTriangle,
    severity: 'low',
    recoveryStrategies: ['validate-form', 'reset-form']
  },
  generic: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. We apologize for the inconvenience.',
    primaryAction: 'Try Again',
    icon: AlertTriangle,
    severity: 'medium',
    recoveryStrategies: ['retry', 'refresh-page', 'fallback']
  }
}

export class AdvancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private touchStartY: number = 0
  private performanceStartTime: number = 0

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      retryCountdown: 0,
      showFeedback: false,
      showHelp: false,
      errorId: this.generateErrorId(),
      lastErrorTime: 0
    }

    // Load persisted error state if enabled
    if (props.persistErrorState) {
      this.loadPersistedErrorState()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Performance tracking
    if (this.props.trackPerformance) {
      performance.mark('error-boundary-render-start')
      this.performanceStartTime = performance.now()
    }

    this.setState({ errorInfo })

    // Enhanced error logging
    console.error(error, {
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      errorBoundary: 'AdvancedErrorBoundary',
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''
    }, {
      type: this.classifyErrorType(error),
      severity: this.classifyErrorSeverity(error),
      category: 'UI',
      recoverable: true
    })

    // Persist error state
    if (this.props.persistErrorState) {
      this.persistErrorState(error)
    }

    // Notify parent component
    this.props.onError?.(error, errorInfo)

    // Complete performance tracking
    if (this.props.trackPerformance) {
      performance.mark('error-boundary-render-end')
      performance.measure('error-boundary-render', 'error-boundary-render-start', 'error-boundary-render-end')
    }
  }

  componentDidMount() {
    // Set up touch gesture listeners for mobile
    if (this.props.supportTouchGestures && 'ontouchstart' in window) {
      this.setupTouchGestures()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private classifyErrorType(error: Error): 'UserError' | 'ApplicationError' | 'SystemError' | 'NetworkError' {
    const message = error.message.toLowerCase()
    if (message.includes('network') || message.includes('fetch')) return 'NetworkError'
    if (message.includes('auth') || message.includes('permission')) return 'UserError'
    return 'ApplicationError'
  }

  private classifyErrorSeverity(error: Error): 'Low' | 'Medium' | 'High' | 'Critical' {
    const message = error.message.toLowerCase()
    if (message.includes('critical') || message.includes('fatal')) return 'Critical'
    if (message.includes('auth') || message.includes('permission')) return 'High'
    if (message.includes('network') || message.includes('validation')) return 'Medium'
    return 'Low'
  }

  private getErrorTypeConfig(error: Error): ErrorTypeConfig {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) return ERROR_TYPE_CONFIGS.network
    if (message.includes('auth')) return ERROR_TYPE_CONFIGS.authentication
    if (message.includes('permission')) return ERROR_TYPE_CONFIGS.permission
    if (message.includes('validation')) return ERROR_TYPE_CONFIGS.validation
    
    return ERROR_TYPE_CONFIGS.generic
  }

  private loadPersistedErrorState() {
    try {
      const stored = sessionStorage.getItem('error-boundary-state')
      if (stored) {
        const { errorCount, lastError, timestamp } = JSON.parse(stored)
        // Only load if error was recent (within last 5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          this.setState({ retryCount: errorCount })
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  private persistErrorState(error: Error) {
    try {
      const state = {
        errorCount: this.state.retryCount + 1,
        lastError: error.message,
        timestamp: Date.now()
      }
      sessionStorage.setItem('error-boundary-state', JSON.stringify(state))
    } catch (e) {
      // Ignore storage errors
    }
  }

  private setupTouchGestures() {
    const handleTouchStart = (e: TouchEvent) => {
      this.touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY
      const deltaY = this.touchStartY - touchEndY

      // Swipe up gesture (> 50px) triggers retry
      if (deltaY > 50 && this.state.hasError && !this.state.isRetrying) {
        this.handleRetry()
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, retryCount), 10000)
  }

  private handleRetry = async () => {
    const { maxRetries = 3, onRetry, recoveryManager } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) return

    const delay = this.calculateRetryDelay(retryCount)
    
    this.setState({
      isRetrying: true,
      retryCountdown: Math.ceil(delay / 1000)
    })

    // Show countdown
    const countdownInterval = setInterval(() => {
      this.setState(prev => {
        if (prev.retryCountdown <= 1) {
          clearInterval(countdownInterval)
          return { retryCountdown: 0 }
        }
        return { retryCountdown: prev.retryCountdown - 1 }
      })
    }, 1000)

    // Wait for delay
    await new Promise(resolve => {
      this.retryTimeoutId = setTimeout(resolve, delay)
    })

    // Attempt recovery using recovery manager if available
    if (recoveryManager && this.state.error) {
      try {
        const result = await recoveryManager.attemptRecovery({
          error: this.state.error,
          strategy: 'retry',
          context: { retryCount: retryCount + 1 }
        })
        
        if (result.success) {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isRetrying: false,
            retryCount: retryCount + 1
          })
          return
        }
      } catch (recoveryError) {
        console.warn('Recovery manager failed:', recoveryError)
      }
    }

    // Standard retry - reset error boundary
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: retryCount + 1
    })

    onRetry?.(retryCount + 1)
  }

  private handleFeedbackSubmit = (feedback: any) => {
    this.props.onFeedbackSubmit?.(feedback)
    this.setState({ showFeedback: false })
  }

  private renderMobileOptimizedLayout(errorConfig: ErrorTypeConfig) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    return (
      <div className={cn(
        "flex min-h-screen items-center justify-center p-4",
        this.props.className
      )}>
        <Card 
          className="max-w-md w-full"
          data-testid="error-card"
          onTouchStart={this.props.supportTouchGestures ? undefined : undefined}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <errorConfig.icon className="h-5 w-5 text-destructive" aria-hidden="true" />
              <CardTitle id="error-title">{errorConfig.title}</CardTitle>
            </div>
            <CardDescription>
              {errorConfig.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error message */}
            <div className="rounded-lg bg-muted p-3 font-mono text-sm">
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            {/* Error ID and retry count */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Error ID: {this.state.errorId}</p>
              {this.state.retryCount > 0 && (
                <p>This error has occurred {this.state.retryCount + 1} times</p>
              )}
            </div>

            {/* Contextual help */}
            {this.props.showContextualHelp && (
              <Collapsible open={this.state.showHelp} onOpenChange={(open) => this.setState({ showHelp: open })}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      What can I do?
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">Here are some things you can try:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Refresh the page</li>
                    <li>Check your internet connection</li>
                    <li>Clear your browser cache</li>
                    <li>Try again in a few minutes</li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Touch gesture hint for mobile */}
            {this.props.supportTouchGestures && isMobile && (
              <Alert>
                <AlertDescription className="text-xs">
                  💡 Swipe up to retry
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter 
            className={cn(
              "flex gap-2",
              isMobile ? "flex-col" : "flex-row"
            )}
            data-testid="error-actions"
          >
            {/* Primary action button */}
            <Button 
              onClick={this.handleRetry}
              disabled={this.state.isRetrying || this.state.retryCount >= (this.props.maxRetries || 3)}
              className="flex-1"
            >
              {this.state.isRetrying ? (
                <>
                  <Timer className="mr-2 h-4 w-4 animate-spin" />
                  {this.state.retryCountdown > 0 ? `Retrying in ${this.state.retryCountdown}s` : 'Retrying...'}
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {errorConfig.primaryAction}
                </>
              )}
            </Button>

            {/* Report issue button */}
            <Button 
              variant="outline" 
              onClick={() => this.setState({ showFeedback: true })}
              className={isMobile ? "flex-1" : ""}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Report Issue
            </Button>

            {/* Navigation button */}
            <Button 
              variant="outline" 
              asChild
              className={isMobile ? "flex-1" : ""}
            >
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* User feedback modal */}
        {this.state.showFeedback && (
          <UserFeedbackCollector
            onSubmit={this.handleFeedbackSubmit}
            onClose={() => this.setState({ showFeedback: false })}
            errorContext={{
              errorId: this.state.errorId,
              errorMessage: this.state.error?.message,
              retryCount: this.state.retryCount
            }}
          />
        )}
      </div>
    )
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const errorConfig = this.getErrorTypeConfig(this.state.error)
      
      // Show fallback content if provided
      if (this.props.fallback) {
        return (
          <div role="alert" aria-live="polite" aria-labelledby="error-title">
            {this.props.fallback}
          </div>
        )
      }

      return (
        <div role="alert" aria-live="polite" aria-labelledby="error-title">
          {this.renderMobileOptimizedLayout(errorConfig)}
        </div>
      )
    }

    return this.props.children
  }
}