"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart,
  Database,
  Server,
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react'
import { useSystemHealth } from '@/src/hooks/queries/use-health'

interface HealthStatusProps {
  className?: string
  refreshInterval?: number
  showDetails?: boolean
}

export function HealthMonitor({ 
  className = "", 
  refreshInterval = 60000,
  showDetails = true 
}: HealthStatusProps) {
  const systemHealth = useSystemHealth()
  const { health, readiness, liveness, overallStatus, isHealthy, isDegraded, isUnhealthy, isChecking } = systemHealth

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500 text-white'
      case 'degraded':
        return 'bg-yellow-500 text-black'
      case 'unhealthy':
        return 'bg-red-500 text-white'
      case 'checking':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'All Systems Operational'
      case 'degraded':
        return 'Some Issues Detected'
      case 'unhealthy':
        return 'System Issues'
      case 'checking':
        return 'Checking Status...'
      default:
        return 'Status Unknown'
    }
  }

  const formatUptime = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const handleRefresh = () => {
    health.refetch()
    readiness.refetch()
    liveness.refetch()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              System Health
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(overallStatus)}>
                {getStatusIcon(overallStatus)}
                <span className="ml-1">{overallStatus.toUpperCase()}</span>
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <span className="text-sm text-muted-foreground">
                {getStatusLabel(overallStatus)}
              </span>
            </div>
            
            {/* Status Progress Bar */}
            <Progress 
              value={isHealthy ? 100 : isDegraded ? 60 : isUnhealthy ? 20 : 0} 
              className="h-2"
            />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last checked: {formatUptime(systemHealth.lastChecked)}</span>
              <span>{systemHealth.errors.length} error(s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Status Cards */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Health Check */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Health Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge 
                    variant="outline" 
                    className={health.isError ? 'border-red-500 text-red-500' : 
                               health.isLoading ? 'border-blue-500 text-blue-500' :
                               'border-green-500 text-green-500'}
                  >
                    {health.isError ? 'Error' : 
                     health.isLoading ? 'Loading' : 
                     health.data?.status || 'Unknown'}
                  </Badge>
                </div>
                
                {health.data?.checks && (
                  <div className="space-y-1">
                    {Object.entries(health.data.checks).map(([service, status]: [string, any]) => (
                      <div key={service} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{service}</span>
                        <div className="flex items-center gap-1">
                          {status.status === 'up' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : status.status === 'degraded' ? (
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>{status.responseTime ? `${status.responseTime}ms` : status.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Readiness Check */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ready to serve</span>
                  <Badge 
                    variant="outline"
                    className={readiness.isError ? 'border-red-500 text-red-500' : 
                               readiness.isLoading ? 'border-blue-500 text-blue-500' :
                               'border-green-500 text-green-500'}
                  >
                    {readiness.isError ? 'Not Ready' : 
                     readiness.isLoading ? 'Checking' : 
                     'Ready'}
                  </Badge>
                </div>
                
                {readiness.error && (
                  <div className="text-xs text-red-500">
                    {readiness.error.message}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Last check: {formatUptime(readiness.dataUpdatedAt || 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liveness Check */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Liveness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">System alive</span>
                  <Badge 
                    variant="outline"
                    className={liveness.isError ? 'border-red-500 text-red-500' : 
                               liveness.isLoading ? 'border-blue-500 text-blue-500' :
                               'border-green-500 text-green-500'}
                  >
                    {liveness.isError ? 'Down' : 
                     liveness.isLoading ? 'Checking' : 
                     'Alive'}
                  </Badge>
                </div>
                
                {liveness.error && (
                  <div className="text-xs text-red-500">
                    {liveness.error.message}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Last check: {formatUptime(liveness.dataUpdatedAt || 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alerts */}
      {systemHealth.errors.length > 0 && (
        <div className="space-y-2">
          {systemHealth.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Health Check Error:</strong> {error.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Information */}
      {health.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Version:</span>
                <span className="ml-2 font-mono">{health.data.version || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="ml-2 font-mono">
                  {health.data.timestamp ? new Date(health.data.timestamp).toLocaleString() : 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Compact version for dashboard widgets
export function HealthWidget() {
  const { overallStatus, isHealthy, errors } = useSystemHealth()

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">System Health</span>
          </div>
          <Badge className={
            isHealthy ? 'bg-green-500 text-white' :
            overallStatus === 'degraded' ? 'bg-yellow-500 text-black' :
            'bg-red-500 text-white'
          }>
            {overallStatus.toUpperCase()}
          </Badge>
        </div>
        {errors.length > 0 && (
          <div className="mt-2 text-xs text-red-500">
            {errors.length} issue(s) detected
          </div>
        )}
      </CardContent>
    </Card>
  )
}