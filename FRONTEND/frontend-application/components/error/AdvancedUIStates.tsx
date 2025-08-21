/**
 * Advanced UI States & Loading Patterns
 * 
 * Comprehensive UI state management with:
 * - Progressive loading patterns
 * - Skeleton screens
 * - Error state animations
 * - Accessibility-focused state transitions
 * - Performance optimized rendering
 */

'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types for different UI states
export type UIState = 
  | 'idle'
  | 'loading'
  | 'success' 
  | 'error'
  | 'retrying'
  | 'partial'
  | 'offline'
  | 'timeout'

export interface StateConfig {
  state: UIState
  message?: string
  progress?: number
  duration?: number
  retryCount?: number
  data?: any
  metadata?: Record<string, any>
}

interface AdvancedLoadingProps {
  state: StateConfig
  onRetry?: () => void
  onCancel?: () => void
  className?: string
  showProgress?: boolean
  showSkeletons?: boolean
  animationType?: 'pulse' | 'wave' | 'fade' | 'bounce'
  size?: 'sm' | 'md' | 'lg'
}

// Skeleton Components
const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
  width = "100%", 
  height = "20px", 
  className 
}) => (
  <div 
    className={cn("bg-muted rounded animate-pulse", className)}
    style={{ width, height }}
    role="presentation"
    aria-hidden="true"
  />
)

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("animate-pulse", className)}>
    <CardHeader className="space-y-2">
      <SkeletonLine width="60%" height="24px" />
      <SkeletonLine width="80%" height="16px" />
    </CardHeader>
    <CardContent className="space-y-3">
      <SkeletonLine width="100%" height="16px" />
      <SkeletonLine width="90%" height="16px" />
      <SkeletonLine width="70%" height="16px" />
      <div className="flex gap-2 mt-4">
        <SkeletonLine width="80px" height="32px" />
        <SkeletonLine width="100px" height="32px" />
      </div>
    </CardContent>
  </Card>
)

const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 animate-pulse">
        <SkeletonLine width="40px" height="40px" className="rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="70%" height="16px" />
          <SkeletonLine width="40%" height="14px" />
        </div>
        <SkeletonLine width="60px" height="20px" />
      </div>
    ))}
  </div>
)

// Progressive Loading Component
interface ProgressiveLoadingProps {
  stages: Array<{
    name: string
    duration: number
    message: string
  }>
  onComplete?: () => void
  onStageChange?: (stage: number) => void
  className?: string
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  stages,
  onComplete,
  onStageChange,
  className
}) => {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (currentStage >= stages.length) {
      setIsComplete(true)
      onComplete?.()
      return
    }

    const stage = stages[currentStage]
    const stageStartTime = Date.now()
    
    const updateProgress = () => {
      const elapsed = Date.now() - stageStartTime
      const stageProgress = Math.min(elapsed / stage.duration, 1) * 100
      const totalProgress = ((currentStage + stageProgress / 100) / stages.length) * 100
      
      setProgress(totalProgress)
      
      if (elapsed >= stage.duration) {
        setCurrentStage(prev => prev + 1)
        onStageChange?.(currentStage + 1)
      } else {
        requestAnimationFrame(updateProgress)
      }
    }
    
    requestAnimationFrame(updateProgress)
  }, [currentStage, stages, onComplete, onStageChange])

  const currentStageData = stages[currentStage] || stages[stages.length - 1]
  const totalElapsed = Date.now() - startTimeRef.current

  return (
    <Card className={cn("max-w-md w-full", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <CardTitle className="text-lg">
            {isComplete ? 'Complete!' : currentStageData.name}
          </CardTitle>
        </div>
        <CardDescription>
          {isComplete ? 'All stages completed successfully' : currentStageData.message}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Stage {isComplete ? stages.length : currentStage + 1} of {stages.length}</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Elapsed: {(totalElapsed / 1000).toFixed(1)}s
        </div>
        
        {/* Stage indicators */}
        <div className="flex gap-1">
          {stages.map((stage, index) => (
            <div
              key={index}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                index < currentStage ? "bg-green-500" :
                index === currentStage ? "bg-primary" : "bg-muted"
              )}
              title={stage.name}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Advanced UI States Component
export const AdvancedUIStates: React.FC<AdvancedLoadingProps> = ({
  state,
  onRetry,
  onCancel,
  className,
  showProgress = false,
  showSkeletons = true,
  animationType = 'pulse',
  size = 'md'
}) => {
  const [animationKey, setAnimationKey] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  // Trigger re-animation when state changes
  useEffect(() => {
    setAnimationKey(prev => prev + 1)
  }, [state.state])

  // Auto-hide success state after delay
  useEffect(() => {
    if (state.state === 'success' && state.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, state.duration)
      return () => clearTimeout(timer)
    }
  }, [state.state, state.duration])

  // Size variants
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg"
  }

  // Animation variants
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-bounce",
    fade: "animate-fade-in",
    bounce: "animate-bounce"
  }

  if (!isVisible) return null

  const renderStateContent = () => {
    switch (state.state) {
      case 'loading':
        return (
          <Card className={cn(sizeClasses[size], "w-full", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Loader2 className={cn(
                  "animate-spin text-primary",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"}>
                  Loading...
                </CardTitle>
              </div>
              {state.message && (
                <CardDescription>{state.message}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {showProgress && typeof state.progress === 'number' && (
                <div className="space-y-2">
                  <Progress value={state.progress} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{state.progress.toFixed(1)}%</span>
                  </div>
                </div>
              )}
              
              {showSkeletons && (
                <div className="space-y-3">
                  <SkeletonList items={2} />
                </div>
              )}
              
              {onCancel && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={onCancel} size={size}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'success':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-green-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className={cn(
                  "text-green-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-green-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  Success!
                </CardTitle>
              </div>
              {state.message && (
                <CardDescription className="text-green-600">{state.message}</CardDescription>
              )}
            </CardHeader>
            
            {state.data && (
              <CardContent>
                <Alert className="border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Operation completed successfully
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        )

      case 'error':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-red-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "text-red-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-red-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  Error Occurred
                </CardTitle>
              </div>
              {state.message && (
                <CardDescription className="text-red-600">{state.message}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {state.message || 'An unexpected error occurred'}
                </AlertDescription>
              </Alert>
              
              {state.retryCount !== undefined && state.retryCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Retry attempts: {state.retryCount}
                </div>
              )}
              
              {onRetry && (
                <div className="flex gap-2">
                  <Button onClick={onRetry} size={size}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  {onCancel && (
                    <Button variant="outline" onClick={onCancel} size={size}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'retrying':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-yellow-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className={cn(
                  "animate-spin text-yellow-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-yellow-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  Retrying...
                </CardTitle>
              </div>
              {state.message && (
                <CardDescription className="text-yellow-600">{state.message}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent>
              {state.retryCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Attempt {state.retryCount}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Please wait...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'offline':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-gray-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <WifiOff className={cn(
                  "text-gray-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-gray-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  You're Offline
                </CardTitle>
              </div>
              <CardDescription>
                {state.message || 'Check your internet connection'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Limited functionality available offline
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )

      case 'timeout':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-orange-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  "text-orange-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-orange-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  Request Timeout
                </CardTitle>
              </div>
              <CardDescription>
                {state.message || 'The request took too long to complete'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {onRetry && (
                <Button onClick={onRetry} size={size} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
            </CardContent>
          </Card>
        )

      case 'partial':
        return (
          <Card className={cn(sizeClasses[size], "w-full border-blue-200", className)} key={animationKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className={cn(
                  "text-blue-500",
                  size === 'sm' ? "h-4 w-4" : size === 'lg' ? "h-6 w-6" : "h-5 w-5"
                )} />
                <CardTitle className={cn(
                  "text-blue-700",
                  size === 'sm' ? "text-base" : size === 'lg' ? "text-xl" : "text-lg"
                )}>
                  Partially Loaded
                </CardTitle>
              </div>
              <CardDescription>
                {state.message || 'Some content loaded successfully'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Alert className="border-blue-200">
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  {state.data ? 'Some data is available' : 'Partial content loaded'}
                </AlertDescription>
              </Alert>
              
              {onRetry && (
                <Button onClick={onRetry} className="mt-4 w-full" size={size}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load Remaining
                </Button>
              )}
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card className={cn(sizeClasses[size], "w-full", className)}>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                Ready
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div 
      className={cn("flex items-center justify-center p-4", animationClasses[animationType])}
      role="status"
      aria-live="polite"
      aria-label={`Current state: ${state.state}`}
    >
      {renderStateContent()}
    </div>
  )
}

// Export skeleton components for individual use
export { SkeletonLine, SkeletonCard, SkeletonList }