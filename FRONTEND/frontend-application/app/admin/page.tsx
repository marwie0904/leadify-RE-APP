"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangle,
  Headphones,
  Zap,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Clock,
  Users,
  Activity,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// Dashboard data interface
interface DashboardData {
  urgentBugs: {
    count: number
    trend: number
    recent: Array<{
      id: string
      title: string
      reporter: string
      time: string
    }>
  }
  supportRequests: {
    count: number
    trend: number
    recent: Array<{
      id: string
      user: string
      subject: string
      time: string
      priority: string
    }>
  }
  tokenUsage: {
    total: number
    dailyAverage: number
    monthlyProjection: number
    trend: number
    chartData: Array<{
      day: string
      tokens: number
    }>
  }
  avgTokenPerOrg: {
    average: number
    topOrganizations: Array<{
      name: string
      tokens: number
      percentage: number
    }>
  }
  systemHealth: {
    apiStatus: string
    uptime: number
    responseTime: number
    activeUsers: number
    activeConversations: number
  }
}

const defaultDashboardData: DashboardData = {
  urgentBugs: {
    count: 3,
    trend: 15, // percentage increase
    recent: [
      { id: "1", title: "Login authentication fails on mobile", reporter: "John Doe", time: "2 hours ago" },
      { id: "2", title: "Chat messages not syncing", reporter: "Jane Smith", time: "4 hours ago" },
      { id: "3", title: "Payment processing timeout", reporter: "Mike Johnson", time: "6 hours ago" }
    ]
  },
  supportRequests: {
    count: 12,
    trend: -8, // percentage decrease
    recent: [
      { id: "1", user: "Alice Brown", subject: "Cannot access dashboard", time: "30 min ago", priority: "urgent" },
      { id: "2", user: "Bob Wilson", subject: "Billing inquiry", time: "1 hour ago", priority: "normal" },
      { id: "3", user: "Carol Davis", subject: "Feature request", time: "2 hours ago", priority: "normal" }
    ]
  },
  tokenUsage: {
    total: 1250000,
    dailyAverage: 45000,
    monthlyProjection: 1350000,
    trend: 22,
    chartData: [
      { day: "Mon", tokens: 42000 },
      { day: "Tue", tokens: 48000 },
      { day: "Wed", tokens: 45000 },
      { day: "Thu", tokens: 51000 },
      { day: "Fri", tokens: 47000 },
      { day: "Sat", tokens: 38000 },
      { day: "Sun", tokens: 35000 }
    ]
  },
  avgTokenPerOrg: {
    average: 8500,
    topOrganizations: [
      { name: "TechCorp Inc.", tokens: 25000, percentage: 35 },
      { name: "Real Estate Pro", tokens: 18000, percentage: 25 },
      { name: "HomeFind Agency", tokens: 12000, percentage: 17 },
      { name: "Property Solutions", tokens: 9000, percentage: 13 },
      { name: "Others", tokens: 7000, percentage: 10 }
    ]
  },
  systemHealth: {
    apiStatus: "operational",
    uptime: 99.98,
    responseTime: 145, // ms
    activeUsers: 234,
    activeConversations: 89
  }
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  color = "blue",
  href 
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  trend?: number
  color?: string
  href?: string
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  }

  const content = (
    <Card className={`bg-white hover:shadow-lg transition-shadow cursor-pointer border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 opacity-80" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            {trend > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}% from last week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

function AdminDashboardContent() {
  const { user, getAuthHeaders } = useAuth()
  const [timeRange, setTimeRange] = useState("week")
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultDashboardData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      setIsLoading(true)
      setError(null)

      try {
        // Get auth headers from context
        const authHeaders = await getAuthHeaders()
        const headers = {
          ...authHeaders,
          'Content-Type': 'application/json'
        }

        // Fetch dashboard stats
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard/stats`, {
          headers
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You do not have permission to access the admin dashboard')
          }
          throw new Error('Failed to fetch dashboard data')
        }

        const data = await response.json()
        
        if (data.success && data.data) {
          // Merge with default data to ensure all properties exist
          setDashboardData({
            ...defaultDashboardData,
            ...data.data,
            // Ensure nested objects are properly merged
            urgentBugs: {
              ...defaultDashboardData.urgentBugs,
              ...(data.data.urgentBugs || {})
            },
            supportRequests: {
              ...defaultDashboardData.supportRequests,
              ...(data.data.supportRequests || {})
            },
            tokenUsage: {
              ...defaultDashboardData.tokenUsage,
              ...(data.data.tokenUsage || {})
            },
            avgTokenPerOrg: {
              ...defaultDashboardData.avgTokenPerOrg,
              ...(data.data.avgTokenPerOrg || {})
            },
            systemHealth: {
              ...defaultDashboardData.systemHealth,
              ...(data.data.systemHealth || {})
            }
          })
        } else {
          throw new Error('Invalid data format received')
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [user, timeRange])
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor system health, issues, and usage metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <Activity className="h-3 w-3 mr-1" />
            System Operational
          </Badge>
          <Badge variant="outline">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Urgent Bug Reports"
          value={isLoading ? "..." : dashboardData.urgentBugs?.count || 0}
          description="Requires immediate attention"
          icon={AlertTriangle}
          trend={isLoading ? undefined : dashboardData.urgentBugs?.trend}
          color="red"
          href="/admin/issues"
        />
        <MetricCard
          title="Feature Requests"
          value={isLoading ? "..." : dashboardData.supportRequests?.count || 0}
          description="Awaiting review"
          icon={Headphones}
          trend={isLoading ? undefined : dashboardData.supportRequests?.trend}
          color="blue"
          href="/admin/feature-requests"
        />
        <MetricCard
          title="Total Token Usage"
          value={isLoading ? "..." : `${((dashboardData.tokenUsage?.total || 0) / 1000).toFixed(0)}K`}
          description={isLoading ? "Loading..." : `Daily avg: ${((dashboardData.tokenUsage?.dailyAverage || 0) / 1000).toFixed(0)}K`}
          icon={Zap}
          trend={isLoading ? undefined : dashboardData.tokenUsage?.trend}
          color="purple"
          href="/admin/ai-analytics"
        />
        <MetricCard
          title="Avg Tokens per Org"
          value={isLoading ? "..." : `${((dashboardData.avgTokenPerOrg?.average || 0) / 1000).toFixed(1)}K`}
          description="Per day average"
          icon={TrendingUp}
          color="green"
          href="/admin/organizations"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Urgent Bugs */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Urgent Bugs</span>
              <Link href="/admin/issues">
                <Button variant="ghost" size="sm">
                  View All
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Critical issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : (dashboardData.urgentBugs?.recent || []).map((bug) => (
                <div key={bug.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{bug.title}</p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{bug.reporter}</span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{bug.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Feature Requests */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Feature Requests</span>
              <Link href="/admin/feature-requests">
                <Button variant="ghost" size="sm">
                  View All
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Latest feature requests from users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : (dashboardData.supportRequests?.recent || []).map((request) => (
                <div key={request.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Headphones className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{request.subject}</p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{request.user}</span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{request.time}</span>
                      {request.priority === "urgent" && (
                        <>
                          <span className="mx-2">•</span>
                          <Badge variant="destructive" className="text-xs py-0 px-1">
                            Urgent
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage by Organization */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Token Usage by Organization</CardTitle>
          <CardDescription>Top organizations by daily token consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (dashboardData.avgTokenPerOrg?.topOrganizations || []).map((org) => (
              <div key={org.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{org.name}</span>
                  <span className="text-muted-foreground">{(org.tokens / 1000).toFixed(0)}K tokens</span>
                </div>
                <Progress value={org.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health Status */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Real-time system performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${dashboardData.systemHealth?.uptime || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${dashboardData.systemHealth?.responseTime || 0}ms`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : dashboardData.systemHealth?.activeUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active Users</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : dashboardData.systemHealth?.activeConversations || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active Chats</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 px-4 py-2">
                <Activity className="h-4 w-4 mr-1" />
                Operational
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  )
}