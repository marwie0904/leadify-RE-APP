"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Building, 
  ChevronDown,
  Users,
  MessageSquare,
  TrendingUp,
  Activity,
  ExternalLink,
  Search,
  Filter,
  Zap,
  Target,
  Calendar,
  BarChart3,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useOrganizations } from "@/hooks/use-organizations"
import { useDebounce } from "@/hooks/use-debounce"
import { useRouter } from "next/navigation"

const planColors = {
  Enterprise: "bg-purple-100 text-purple-700 border-purple-300",
  Professional: "bg-blue-100 text-blue-700 border-blue-300",
  Starter: "bg-green-100 text-green-700 border-green-300",
  Free: "bg-gray-100 text-gray-700 border-gray-300"
}

// Loading skeleton component
const OrganizationCardSkeleton = () => (
  <Card className="bg-white">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-full mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function OrganizationsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(10)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500)
  
  // Fetch organizations data
  const { data, loading, error, refetch } = useOrganizations(currentPage, limit, debouncedSearch)

  // Check admin authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token')
    const adminUser = localStorage.getItem('admin_user')
    
    if (!adminToken || !adminUser) {
      console.log('[Organizations] No admin credentials found')
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Format token count
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`
    }
    return tokens.toString()
  }

  const OrganizationCard = ({ org }: { org: any }) => {
    const isExpanded = expandedOrg === org.id

    return (
      <Card className="bg-white hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-orange-600" />
                <span>{org.name}</span>
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className={planColors[org.plan as keyof typeof planColors] || planColors.Free}>
                  {org.plan}
                </Badge>
                <span>•</span>
                <Calendar className="h-3 w-3" />
                <span>Since {new Date(org.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <Badge variant={org.status === "active" ? "default" : "secondary"}>
                  {org.status}
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{org.metrics.monthly.users}</div>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{org.metrics.monthly.leads}</div>
              <p className="text-xs text-muted-foreground">Leads/mo</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{org.metrics.monthly.conversations}</div>
              <p className="text-xs text-muted-foreground">Convos/mo</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTokens(org.metrics.monthly.tokens)}</div>
              <p className="text-xs text-muted-foreground">Tokens/mo</p>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t pt-4 space-y-4">
              {/* Lead Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  Lead Classification
                </h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <Badge variant="destructive" className="w-full justify-center">
                      Priority: {org.leadClassification.priority}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline" className="w-full justify-center bg-red-50">
                      Hot: {org.leadClassification.hot}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline" className="w-full justify-center bg-orange-50">
                      Warm: {org.leadClassification.warm}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline" className="w-full justify-center bg-blue-50">
                      Cold: {org.leadClassification.cold}
                    </Badge>
                  </div>
                </div>
                {org.leadClassification.unclassified > 0 && (
                  <div className="mt-2">
                    <Badge variant="outline" className="w-full justify-center">
                      Unclassified: {org.leadClassification.unclassified}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Lifetime Stats */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  Lifetime Totals
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Leads:</span>
                    <span className="font-medium">{formatNumber(org.metrics.lifetime.leads)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Conversations:</span>
                    <span className="font-medium">{formatNumber(org.metrics.lifetime.conversations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tokens:</span>
                    <span className="font-medium">{formatTokens(org.metrics.lifetime.tokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Spent:</span>
                    <span className="font-medium">${org.metrics.lifetime.spent}</span>
                  </div>
                </div>
              </div>

              {/* Conversion Rate */}
              {org.metrics.lifetime.leads > 0 && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className="font-medium">
                      {((org.leadClassification.qualified / org.metrics.lifetime.leads) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(org.leadClassification.qualified / org.metrics.lifetime.leads) * 100} 
                    className="h-2 mt-1" 
                  />
                </div>
              )}

              {/* Action Button */}
              <Link href={`/admin/organizations/${org.id}`}>
                <Button className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <CardContent className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking authentication...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Building className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organizations</h1>
          </div>
          <p className="text-gray-600 mt-1">Monitor and analyze organization performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalOrganizations}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.summary.totalUsers)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.summary.totalLeadsMonth)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.summary.totalConversationsMonth)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tokens This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTokens(data.summary.totalTokensMonth)}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Search and Filter */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Search Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search organizations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Grid */}
      {loading && !data ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <OrganizationCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load organizations. Please try again.
          </AlertDescription>
        </Alert>
      ) : data && data.organizations.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {data.organizations.map((org) => (
              <OrganizationCard key={org.id} org={org} />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, data.pagination.total)} of {data.pagination.total} organizations
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  {data.pagination.totalPages > 5 && (
                    <span className="px-2">...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={currentPage === data.pagination.totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="bg-white">
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No organizations found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}