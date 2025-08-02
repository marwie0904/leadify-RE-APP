'use client'

import React from 'react'
import { ErrorBoundary } from './error-boundary'
import { 
  NetworkErrorFallback, 
  AuthErrorFallback, 
  ServerErrorFallback,
  ComponentErrorFallback 
} from './error-fallbacks'
import { getErrorType, errorLogger } from '@/lib/error-logger'

interface FeatureErrorBoundaryProps {
  children: React.ReactNode
  feature: string
  fallbackType?: 'network' | 'auth' | 'server' | 'component' | 'default'
}

export function FeatureErrorBoundary({ 
  children, 
  feature, 
  fallbackType = 'default' 
}: FeatureErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    errorLogger.log(error, errorInfo, {
      feature,
      type: fallbackType || getErrorType(error)
    })
  }

  const getFallbackComponent = () => {
    if (fallbackType === 'default') {
      return undefined // Use default ErrorBoundary fallback
    }

    switch (fallbackType) {
      case 'network':
        return NetworkErrorFallback
      case 'auth':
        return AuthErrorFallback
      case 'server':
        return ServerErrorFallback
      case 'component':
        return ComponentErrorFallback
      default:
        return undefined
    }
  }

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={getFallbackComponent()}
    >
      {children}
    </ErrorBoundary>
  )
}

// Specialized error boundaries for common features

export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <FeatureErrorBoundary feature="chat" fallbackType="component">
      {children}
    </FeatureErrorBoundary>
  )
}

export function AgentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <FeatureErrorBoundary feature="agents" fallbackType="server">
      {children}
    </FeatureErrorBoundary>
  )
}

export function AnalyticsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <FeatureErrorBoundary feature="analytics" fallbackType="component">
      {children}
    </FeatureErrorBoundary>
  )
}

export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <FeatureErrorBoundary feature="dashboard" fallbackType="component">
      {children}
    </FeatureErrorBoundary>
  )
}