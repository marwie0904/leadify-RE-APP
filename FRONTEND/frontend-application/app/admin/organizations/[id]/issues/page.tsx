"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Removed tabs imports - using separate sections instead
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  Bug,
  Lightbulb,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Calendar,
  ChevronRight,
  X,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  MessageSquare,
  FileText,
  Tag,
  Archive
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { mockIssuesData } from "@/lib/test-data"

interface Issue {
  id: string
  organization_id: string
  user_id: string
  user_email: string
  user_name: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  resolved_at?: string
  resolution?: string
  assigned_to?: string
  agent_id?: string
  agent_name?: string
}

interface FeatureRequest {
  id: string
  organization_id: string
  user_id: string
  user_email: string
  user_name: string
  requested_feature: string
  reason: string
  category?: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  upvotes?: number
  implementation_notes?: string
}

interface Stats {
  issues: {
    total: number
    open: number
    in_progress: number
    resolved: number
    critical: number
    high_priority: number
  }
  feature_requests: {
    total: number
    submitted: number
    under_review: number
    planned: number
    implemented: number
    top_category: string
  }
  response_metrics: {
    avg_resolution_time: number
    avg_response_time: number
    satisfaction_rate: number
  }
}

export default function OrganizationIssuesPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [issues, setIssues] = useState<Issue[]>([])
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [expandedSections, setExpandedSections] = useState({ issues: true, features: true })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<FeatureRequest | null>(null)
  
  const fetchData = async () => {
    try {
      // Check for test mode
      const isTestMode = typeof window !== 'undefined' && localStorage.getItem('test_mode') === 'true'
      
      if (isTestMode) {
        // Use mock data in test mode
        const processedIssues = mockIssuesData.issues.map((issue: any) => ({
          ...issue,
          user_email: issue.reporter || 'user@example.com',
          user_name: issue.reporter?.split('@')[0] || 'User',
          subject: issue.title,
          agent_name: 'Support Bot'
        }))
        
        const processedFeatures = mockIssuesData.features.map((feature: any) => ({
          ...feature,
          user_email: feature.requester || 'user@example.com',
          user_name: feature.requester?.split('@')[0] || 'User',
          requested_feature: feature.title,
          reason: feature.description,
          upvotes: feature.votes || 0
        }))
        
        // Calculate statistics
        const openIssues = processedIssues.filter(i => i.status === 'open').length
        const inProgressIssues = processedIssues.filter(i => i.status === 'investigating').length
        const resolvedIssues = processedIssues.filter(i => i.status === 'resolved').length
        const criticalIssues = processedIssues.filter(i => i.priority === 'critical').length
        const highPriorityIssues = processedIssues.filter(i => i.priority === 'high').length
        
        const submittedFeatures = processedFeatures.filter(f => f.status === 'submitted' || f.status === 'under_review').length
        const underReviewFeatures = processedFeatures.filter(f => f.status === 'under_review').length
        const plannedFeatures = processedFeatures.filter(f => f.status === 'planned').length
        const implementedFeatures = processedFeatures.filter(f => f.status === 'implemented').length
        
        const calculatedStats: Stats = {
          issues: {
            total: processedIssues.length,
            open: openIssues,
            in_progress: inProgressIssues,
            resolved: resolvedIssues,
            critical: criticalIssues,
            high_priority: highPriorityIssues
          },
          feature_requests: {
            total: processedFeatures.length,
            submitted: submittedFeatures,
            under_review: underReviewFeatures,
            planned: plannedFeatures,
            implemented: implementedFeatures,
            top_category: 'Integration'
          },
          response_metrics: {
            avg_resolution_time: 48,
            avg_response_time: 4,
            satisfaction_rate: 85
          }
        }
        
        setIssues(processedIssues)
        setFeatureRequests(processedFeatures)
        setStats(calculatedStats)
        setError(null)
        setLoading(false)
        setRefreshing(false)
        return
      }
      
      const token = localStorage.getItem('admin_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      // Fetch issues
      const issuesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/issues`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!issuesResponse.ok) {
        throw new Error('Failed to fetch issues')
      }
      
      const issuesData = await issuesResponse.json()
      
      // Fetch feature requests
      const featuresResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/feature-requests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!featuresResponse.ok) {
        throw new Error('Failed to fetch feature requests')
      }
      
      const featuresData = await featuresResponse.json()
      
      // Process data
      const processedIssues: Issue[] = issuesData.issues?.map((issue: any) => ({
        ...issue,
        agent_name: issue.agent?.name || 'N/A'
      })) || []
      
      const processedFeatures: FeatureRequest[] = featuresData.featureRequests || []
      
      // Calculate statistics
      const openIssues = processedIssues.filter(i => i.status === 'open').length
      const inProgressIssues = processedIssues.filter(i => i.status === 'in_progress').length
      const resolvedIssues = processedIssues.filter(i => i.status === 'resolved').length
      const criticalIssues = processedIssues.filter(i => i.priority === 'critical').length
      const highPriorityIssues = processedIssues.filter(i => i.priority === 'high').length
      
      const submittedFeatures = processedFeatures.filter(f => f.status === 'submitted').length
      const underReviewFeatures = processedFeatures.filter(f => f.status === 'under_review').length
      const plannedFeatures = processedFeatures.filter(f => f.status === 'planned').length
      const implementedFeatures = processedFeatures.filter(f => f.status === 'implemented').length
      
      // Get top category for feature requests
      const categoryCounts: Record<string, number> = {}
      processedFeatures.forEach(f => {
        const category = f.category || 'Other'
        categoryCounts[category] = (categoryCounts[category] || 0) + 1
      })
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      
      const calculatedStats: Stats = {
        issues: {
          total: processedIssues.length,
          open: openIssues,
          in_progress: inProgressIssues,
          resolved: resolvedIssues,
          critical: criticalIssues,
          high_priority: highPriorityIssues
        },
        feature_requests: {
          total: processedFeatures.length,
          submitted: submittedFeatures,
          under_review: underReviewFeatures,
          planned: plannedFeatures,
          implemented: implementedFeatures,
          top_category: topCategory
        },
        response_metrics: {
          avg_resolution_time: 48, // Mock: hours
          avg_response_time: 4, // Mock: hours
          satisfaction_rate: 85 // Mock: percentage
        }
      }
      
      setIssues(processedIssues)
      setFeatureRequests(processedFeatures)
      setStats(calculatedStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchData()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }
  
  const getStatusColor = (status: string, type: 'issue' | 'feature' = 'issue') => {
    if (type === 'issue') {
      switch (status) {
        case 'open':
          return 'bg-red-100 text-red-700 border-red-300'
        case 'in_progress':
          return 'bg-yellow-100 text-yellow-700 border-yellow-300'
        case 'resolved':
          return 'bg-green-100 text-green-700 border-green-300'
        case 'closed':
          return 'bg-gray-100 text-gray-700 border-gray-300'
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300'
      }
    } else {
      switch (status) {
        case 'submitted':
          return 'bg-blue-100 text-blue-700 border-blue-300'
        case 'under_review':
          return 'bg-yellow-100 text-yellow-700 border-yellow-300'
        case 'planned':
          return 'bg-purple-100 text-purple-700 border-purple-300'
        case 'implemented':
          return 'bg-green-100 text-green-700 border-green-300'
        case 'rejected':
          return 'bg-red-100 text-red-700 border-red-300'
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300'
      }
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <Star className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-500" />
      case 'feature':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />
      case 'enhancement':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'documentation':
        return <FileText className="h-4 w-4 text-gray-500" />
      default:
        return <Tag className="h-4 w-4 text-gray-500" />
    }
  }
  
  // Filter and sort issues
  const filteredIssues = issues
    .filter(issue => {
      if (searchTerm && 
          !issue.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !issue.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !issue.user_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (statusFilter !== "all" && issue.status !== statusFilter) {
        return false
      }
      if (priorityFilter !== "all" && issue.priority !== priorityFilter) {
        return false
      }
      if (categoryFilter !== "all" && issue.category !== categoryFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "priority":
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 99)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })
  
  // Filter and sort feature requests
  const filteredFeatures = featureRequests
    .filter(feature => {
      if (searchTerm && 
          !feature.requested_feature.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !feature.reason.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !feature.user_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (statusFilter !== "all" && feature.status !== statusFilter) {
        return false
      }
      if (priorityFilter !== "all" && feature.priority !== priorityFilter) {
        return false
      }
      if (categoryFilter !== "all" && feature.category !== categoryFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "priority":
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 99)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })
  
  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchData()
            }}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Issues Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle>Issues</CardTitle>
                <CardDescription>
                  {stats ? `${stats.issues.open} open, ${stats.issues.critical} critical` : 'Loading...'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedSections(prev => ({ ...prev, issues: !prev.issues }))}
              >
                {expandedSections.issues ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.issues && (
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Issues Table */}
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No issues found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{issue.subject}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {issue.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{issue.user_name}</div>
                            <div className="text-xs text-gray-500">{issue.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getCategoryIcon(issue.category)}
                            <span className="ml-2 text-sm capitalize">{issue.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                            <span className="flex items-center">
                              {getPriorityIcon(issue.priority)}
                              <span className="ml-1 capitalize">{issue.priority}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(issue.status, 'issue')}>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatTimeAgo(issue.created_at)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(issue.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Issue Details Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">{selectedIssue.subject}</div>
              </div>
              <div>
                <Label>Description</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                  {selectedIssue.description}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reporter</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedIssue.user_name}</div>
                    <div className="text-sm text-gray-500">{selectedIssue.user_email}</div>
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedIssue.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">
                      {selectedIssue.category}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getPriorityColor(selectedIssue.priority)}>
                      {selectedIssue.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getStatusColor(selectedIssue.status, 'issue')}>
                      {selectedIssue.status}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedIssue.resolution && (
                <div>
                  <Label>Resolution</Label>
                  <div className="mt-1 p-2 bg-green-50 rounded">
                    {selectedIssue.resolution}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIssue(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Feature Request Details Dialog */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feature Request Details</DialogTitle>
          </DialogHeader>
          {selectedFeature && (
            <div className="space-y-4">
              <div>
                <Label>Requested Feature</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">{selectedFeature.requested_feature}</div>
              </div>
              <div>
                <Label>Reason / Use Case</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                  {selectedFeature.reason}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Requester</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedFeature.user_name}</div>
                    <div className="text-sm text-gray-500">{selectedFeature.user_email}</div>
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedFeature.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getPriorityColor(selectedFeature.priority)}>
                      {selectedFeature.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getStatusColor(selectedFeature.status, 'feature')}>
                      {selectedFeature.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Upvotes</Label>
                  <div className="mt-1 flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    <span className="font-medium">{selectedFeature.upvotes || 0}</span>
                  </div>
                </div>
              </div>
              {selectedFeature.implementation_notes && (
                <div>
                  <Label>Implementation Notes</Label>
                  <div className="mt-1 p-2 bg-blue-50 rounded">
                    {selectedFeature.implementation_notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeature(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Feature Requests Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <div>
                <CardTitle>Feature Requests</CardTitle>
                <CardDescription>
                  {stats ? `${stats.feature_requests.total} total, ${stats.feature_requests.planned} planned` : 'Loading...'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSections(prev => ({ ...prev, features: !prev.features }))}
            >
              {expandedSections.features ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.features && (
          <CardContent>
            {/* Features Table */}
            {filteredFeatures.length === 0 ? (
              <div className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No feature requests found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature Request</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Upvotes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeatures.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{feature.requested_feature}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {feature.reason}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{feature.user_name}</div>
                            <div className="text-xs text-gray-500">{feature.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(feature.priority)}>
                            <span className="flex items-center">
                              {getPriorityIcon(feature.priority)}
                              <span className="ml-1 capitalize">{feature.priority}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(feature.status, 'feature')}>
                            {feature.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-1 text-yellow-500" />
                            <span className="font-medium">{feature.upvotes || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatTimeAgo(feature.created_at)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(feature.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFeature(feature)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}