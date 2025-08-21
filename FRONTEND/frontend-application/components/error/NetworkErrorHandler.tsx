/**
 * Network Error Handler Component
 * 
 * Specialized error boundary for network-related errors with:
 * - Offline detection and handling
 * - Connection retry mechanisms
 * - Cached content fallback
 * - Network status monitoring
 */

'use client'

import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Globe,
  Zap,
  Archive,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NetworkErrorState {
  hasError: boolean
  error: Error | null
  isOnline: boolean
  connectionType: string
  retryAttempts: number
  isRetrying: boolean
  hasCachedContent: boolean
  networkSpeed: 'slow' | 'medium' | 'fast' | 'unknown'
}

interface NetworkErrorProps {
  children: ReactNode
  enableOfflineMode?: boolean
  maxRetryAttempts?: number
  retryInterval?: number
  onNetworkChange?: (isOnline: boolean) => void
  onRetrySuccess?: () => void
  onRetryFailure?: (error: Error) => void
  cachedContentProvider?: () => Promise<ReactNode>
  className?: string
}

// Network speed detection
const detectNetworkSpeed = (): Promise<'slow' | 'medium' | 'fast' | 'unknown'> => {
  return new Promise((resolve) => {
    if (!navigator.connection) {
      resolve('unknown')
      return
    }

    const connection = navigator.connection as any
    const effectiveType = connection.effectiveType

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        resolve('slow')
        break
      case '3g':
        resolve('medium')
        break
      case '4g':
        resolve('fast')
        break
      default:
        resolve('unknown')
    }
  })
}

// Network connectivity test
const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    // Fallback: assume disconnected if health check fails
    return false
  }
}

export class NetworkErrorHandler extends Component<NetworkErrorProps, NetworkErrorState> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private networkMonitorId: NodeJS.Timeout | null = null

  constructor(props: NetworkErrorProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown',
      retryAttempts: 0,
      isRetrying: false,
      hasCachedContent: false,
      networkSpeed: 'unknown'
    }
  }

  static getDerivedStateFromError(error: Error): Partial<NetworkErrorState> {
    // Only handle network-related errors
    const isNetworkError = 
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('connection') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' && error.message.includes('Failed to fetch')

    if (isNetworkError) {
      return {
        hasError: true,
        error
      }
    }

    // Let other error boundaries handle non-network errors
    throw error
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Network Error caught:', error, errorInfo)
    
    // Detect network status and speed
    this.updateNetworkStatus()
    
    // Check for cached content
    this.checkCachedContent()
  }

  componentDidMount() {
    // Set up network monitoring
    this.setupNetworkMonitoring()
    
    // Initial network status check
    this.updateNetworkStatus()
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    if (this.networkMonitorId) {
      clearInterval(this.networkMonitorId)
    }
    
    // Clean up event listeners
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  private setupNetworkMonitoring() {
    // Browser online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    
    // Periodic connectivity check
    this.networkMonitorId = setInterval(async () => {
      if (this.state.hasError) {
        const isConnected = await testNetworkConnectivity()
        if (isConnected && !this.state.isOnline) {
          this.setState({ isOnline: true })
          this.props.onNetworkChange?.(true)
        } else if (!isConnected && this.state.isOnline) {
          this.setState({ isOnline: false })
          this.props.onNetworkChange?.(false)
        }
      }
    }, 10000) // Check every 10 seconds
  }

  private handleOnline = () => {
    this.setState({ isOnline: true })
    this.props.onNetworkChange?.(true)
    
    // Auto-retry when coming back online
    if (this.state.hasError && !this.state.isRetrying) {
      this.handleRetry()
    }
  }

  private handleOffline = () => {
    this.setState({ isOnline: false })
    this.props.onNetworkChange?.(false)
  }

  private async updateNetworkStatus() {
    // Detect connection type
    const connection = (navigator as any).connection
    if (connection) {
      this.setState({
        connectionType: connection.effectiveType || 'unknown'
      })
    }
    
    // Detect network speed
    const speed = await detectNetworkSpeed()
    this.setState({ networkSpeed: speed })
  }

  private async checkCachedContent() {
    if (this.props.cachedContentProvider) {
      try {
        const cachedContent = await this.props.cachedContentProvider()
        this.setState({ hasCachedContent: !!cachedContent })
      } catch {
        this.setState({ hasCachedContent: false })
      }
    }
  }

  private handleRetry = async () => {
    const { maxRetryAttempts = 3, retryInterval = 2000 } = this.props
    
    if (this.state.retryAttempts >= maxRetryAttempts) {
      return
    }

    this.setState({ isRetrying: true })

    try {
      // Test connectivity first
      const isConnected = await testNetworkConnectivity()
      
      if (!isConnected) {
        throw new Error('No network connectivity')
      }

      // Wait for retry interval
      await new Promise(resolve => {
        this.retryTimeoutId = setTimeout(resolve, retryInterval)
      })

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false,
        retryAttempts: this.state.retryAttempts + 1
      })

      this.props.onRetrySuccess?.()
    } catch (error) {
      this.setState({
        isRetrying: false,
        retryAttempts: this.state.retryAttempts + 1
      })
      this.props.onRetryFailure?.(error as Error)
    }
  }

  private handleCheckConnection = async () => {
    this.setState({ isRetrying: true })
    
    try {
      const isConnected = await testNetworkConnectivity()
      this.setState({ 
        isOnline: isConnected,
        isRetrying: false 
      })
      
      if (isConnected) {
        // Auto-retry after successful connection test
        this.handleRetry()
      }
    } catch {
      this.setState({ isRetrying: false })
    }
  }

  private renderNetworkStatus() {
    const { isOnline, connectionType, networkSpeed } = this.state
    
    return (
      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        
        <div className="flex gap-1">
          {connectionType !== 'unknown' && (
            <Badge variant="outline" className="text-xs">
              {connectionType.toUpperCase()}
            </Badge>
          )}
          {networkSpeed !== 'unknown' && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                networkSpeed === 'slow' && "text-red-500",
                networkSpeed === 'medium' && "text-yellow-500",
                networkSpeed === 'fast' && "text-green-500"
              )}
            >
              <Activity className="h-3 w-3 mr-1" />
              {networkSpeed}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  private renderOfflineMode() {
    if (!this.props.enableOfflineMode) return null

    return (
      <Alert>
        <Globe className="h-4 w-4" />
        <div>
          <h4 className="font-medium">You're currently offline</h4>
          <AlertDescription>
            {this.state.hasCachedContent 
              ? "Cached content available below" 
              : "Limited functionality available offline"
            }
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className={cn("min-h-screen flex items-center justify-center p-4", this.props.className)}>
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-destructive" />
                <CardTitle>Connection Problem</CardTitle>
              </div>
              <CardDescription>
                Unable to connect to our servers. Please check your internet connection.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Network status */}
              {this.renderNetworkStatus()}

              {/* Error details */}
              <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                {this.state.error.message}
              </div>

              {/* Offline mode alert */}
              {!this.state.isOnline && this.renderOfflineMode()}

              {/* Retry attempts indicator */}
              {this.state.retryAttempts > 0 && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Retry attempts: {this.state.retryAttempts}/{this.props.maxRetryAttempts || 3}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button 
                onClick={this.handleRetry}
                disabled={this.state.isRetrying || this.state.retryAttempts >= (this.props.maxRetryAttempts || 3)}
                className="flex-1"
              >
                {this.state.isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={this.handleCheckConnection}
                disabled={this.state.isRetrying}
              >
                <Activity className="mr-2 h-4 w-4" />
                Check Connection
              </Button>

              {this.state.hasCachedContent && (
                <Button variant="outline" size="sm">
                  <Archive className="mr-2 h-4 w-4" />
                  View Cached
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'medium' | 'fast' | 'unknown'>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Detect connection info
    const connection = (navigator as any).connection
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown')
      
      const updateConnection = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }
      
      connection.addEventListener('change', updateConnection)
    }

    // Detect network speed
    detectNetworkSpeed().then(setNetworkSpeed)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (connection) {
        connection.removeEventListener('change', () => {})
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    networkSpeed,
    testConnectivity: testNetworkConnectivity
  }
}