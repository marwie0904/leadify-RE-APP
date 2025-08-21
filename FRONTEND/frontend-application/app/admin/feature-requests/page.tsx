"use client"

import { useState, useEffect } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  MoreVertical,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  ThumbsUp,
  Search,
  Filter,
  Archive,
  ChevronRight,
  Loader2,
  AlertCircle,
  Star,
  XCircle,
  PauseCircle,
  PlayCircle,
  Plus
} from "lucide-react"
import { toast } from "sonner"

interface FeatureRequest {
  id: string
  requested_feature: string
  reason: string
  status: 'submitted' | 'under_review' | 'planned' | 'in_development' | 'completed' | 'rejected' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user_email: string
  user_name: string | null
  organization_id: string | null
  upvotes: number
  comment_count?: number
  admin_notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  completed_at: string | null
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="h-4 w-4" />
    case 'high':
      return <TrendingUp className="h-4 w-4" />
    case 'medium':
      return <Star className="h-4 w-4" />
    case 'low':
      return <Clock className="h-4 w-4" />
    default:
      return <Star className="h-4 w-4" />
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'submitted':
      return <Clock className="h-4 w-4" />
    case 'under_review':
      return <Search className="h-4 w-4" />
    case 'planned':
      return <Calendar className="h-4 w-4" />
    case 'in_development':
      return <PlayCircle className="h-4 w-4" />
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'rejected':
      return <XCircle className="h-4 w-4" />
    case 'on_hold':
      return <PauseCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200'
    case 'under_review':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200'
    case 'planned':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200'
    case 'in_development':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200'
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200'
  }
}

function AdminFeatureRequestsContent() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set())
  const [adminNotes, setAdminNotes] = useState("")
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    requestedFeature: '',
    reason: '',
    priority: 'medium' as FeatureRequest['priority']
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchFeatureRequests()
    
    // Set up auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchFeatureRequests(true) // silent refresh
    }, 15000)
    
    // Also refresh when window regains focus
    const handleFocus = () => {
      fetchFeatureRequests(true) // silent refresh
    }
    window.addEventListener('focus', handleFocus)
    
    // Listen for custom event when new feature request is submitted
    const handleNewRequest = () => {
      setTimeout(() => {
        fetchFeatureRequests(false) // visible refresh to show the new request
      }, 1000) // Small delay to ensure the request is saved in the database
    }
    window.addEventListener('newFeatureRequest', handleNewRequest)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('newFeatureRequest', handleNewRequest)
    }
  }, [])

  const fetchFeatureRequests = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token')
      const authToken = localStorage.getItem('auth_token')
      const token = adminToken || authToken
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      console.log('[Feature Requests] Using token:', token ? 'Yes' : 'No');
      console.log('[Feature Requests] API URL:', `${process.env.NEXT_PUBLIC_API_URL}/api/admin/feature-requests`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/feature-requests`, {
        headers
      })

      console.log('[Feature Requests] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Feature Requests] Error response:', errorText);
        
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        if (response.status === 401) {
          throw new Error('Authentication required')
        }
        // Check if it's a database table not found error
        if (errorText.includes('relation') && errorText.includes('does not exist')) {
          throw new Error('Feature requests table not found. Please run the database migration: migrations/create-feature-requests-table.sql')
        }
        throw new Error(`Failed to fetch feature requests: ${errorText}`)
      }

      const data = await response.json()
      console.log('[Admin Feature Requests] API Response:', data)
      
      if (data.success && data.data) {
        const requestsData = data.data.requests || data.data
        const requestsArray: FeatureRequest[] = Array.isArray(requestsData) ? requestsData : []
        const sortedRequests = [...requestsArray].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        // Find truly new requests (not in the previous list)
        const previousRequestIds = new Set(requests.map(r => r.id))
        const newlyAddedRequests = sortedRequests.filter((request) => !previousRequestIds.has(request.id))
        
        // Track new request IDs for highlighting
        if (newlyAddedRequests.length > 0) {
          const newIds = new Set(newlyAddedRequests.map((r) => r.id))
          setNewRequestIds(newIds)
          
          // Clear highlighting after 5 seconds
          setTimeout(() => {
            setNewRequestIds(new Set())
          }, 5000)
          
          // Show toast for new requests
          if (silent && newlyAddedRequests.length > 0) {
            toast.success(`${newlyAddedRequests.length} new feature request${newlyAddedRequests.length > 1 ? 's' : ''} received`)
          }
        }
        
        setRequests(sortedRequests)
        setLastRefreshed(new Date())
      }
    } catch (error: any) {
      console.error('[Admin Feature Requests] Error:', error)
      setError(error.message)
      if (!silent) {
        toast.error(error.message)
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleCreateFeatureRequest = async () => {
    if (!createFormData.requestedFeature || !createFormData.reason) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setIsCreating(true)
    
    try {
      const adminToken = localStorage.getItem('admin_token')
      const authToken = localStorage.getItem('auth_token')
      const token = adminToken || authToken
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requested_feature: createFormData.requestedFeature,
          reason: createFormData.reason,
          priority: createFormData.priority
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create feature request')
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success('Feature request created successfully')
        setShowCreateDialog(false)
        setCreateFormData({
          requestedFeature: '',
          reason: '',
          priority: 'medium'
        })
        // Refresh requests list
        fetchFeatureRequests()
      }
    } catch (err) {
      console.error('Error creating feature request:', err)
      toast.error('Failed to create feature request')
    } finally {
      setIsCreating(false)
    }
  }

  const updateRequestStatus = async (requestId: string, updates: Partial<FeatureRequest>) => {
    setUpdatingStatus(requestId)
    
    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token')
      const authToken = localStorage.getItem('auth_token')
      const token = adminToken || authToken
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/feature-requests/${requestId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update feature request')
      }

      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, ...updates } : req
        ))
        
        // Update selected request if it's the same one
        if (selectedRequest?.id === requestId) {
          setSelectedRequest({ ...selectedRequest, ...updates })
        }
        
        toast.success('Feature request updated successfully')
      }
    } catch (error: any) {
      console.error('[Admin Feature Requests] Update error:', error)
      toast.error(error.message || 'Failed to update feature request')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority
    const matchesStatus = filterStatus === "all" || request.status === filterStatus
    const matchesSearch = searchQuery === "" || 
      request.requested_feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesPriority && matchesStatus && matchesSearch
  })

  const timeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return then.toLocaleDateString()
  }

  if (loading && !isRefreshing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-blue-600" />
            Feature Requests
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and prioritize feature requests from users
            {lastRefreshed && (
              <span className="ml-2 text-xs">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Feature Request
          </Button>
          <Button onClick={() => fetchFeatureRequests(false)} disabled={isRefreshing} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search feature requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_development">In Development</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter(r => r.status === 'under_review').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {requests.filter(r => r.status === 'planned').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Development</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {requests.filter(r => r.status === 'in_development').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Requests List */}
      {error ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={() => fetchFeatureRequests(false)} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || filterPriority !== "all" || filterStatus !== "all" 
                ? "No feature requests match your filters"
                : "No feature requests yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              className={`transition-all ${
                newRequestIds.has(request.id) 
                  ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse' 
                  : ''
              } ${
                updatingStatus === request.id ? 'opacity-50' : ''
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {request.requested_feature}
                      </h3>
                      {newRequestIds.has(request.id) && (
                        <Badge className="bg-blue-500 text-white">New</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {request.reason}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getPriorityColor(request.priority)}>
                        {getPriorityIcon(request.priority)}
                        <span className="ml-1">{request.priority}</span>
                      </Badge>
                      
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status.replace('_', ' ')}</span>
                      </Badge>
                      
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {request.upvotes || 0} votes
                      </Badge>
                      
                      {request.comment_count && request.comment_count > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {request.comment_count} comments
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {request.user_name || request.user_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {timeAgo(request.created_at)}
                      </span>
                    </div>
                    
                    {request.admin_notes && (
                      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={updatingStatus === request.id}>
                        {updatingStatus === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => {
                        setSelectedRequest(request)
                        setAdminNotes(request.admin_notes || "")
                        setDialogOpen(true)
                      }}>
                        View Details
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs">Update Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'under_review' })}>
                        Mark as Under Review
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'planned' })}>
                        Mark as Planned
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'in_development' })}>
                        Mark as In Development
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'completed' })}>
                        Mark as Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'rejected' })}>
                        Mark as Rejected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { status: 'on_hold' })}>
                        Mark as On Hold
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs">Update Priority</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { priority: 'urgent' })}>
                        Set as Urgent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { priority: 'high' })}>
                        Set as High
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { priority: 'medium' })}>
                        Set as Medium
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, { priority: 'low' })}>
                        Set as Low
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Feature Request Details
                </DialogTitle>
                <DialogDescription>
                  Manage and update this feature request
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Requested Feature</Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    {selectedRequest.requested_feature}
                  </p>
                </div>
                
                <div>
                  <Label>Reason</Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    {selectedRequest.reason}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={selectedRequest.status} 
                      onValueChange={(value) => {
                        setSelectedRequest({ ...selectedRequest, status: value as any })
                      }}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_development">In Development</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={selectedRequest.priority} 
                      onValueChange={(value) => {
                        setSelectedRequest({ ...selectedRequest, priority: value as any })
                      }}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="admin-notes">Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this feature request..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Submitted By</Label>
                    <p className="mt-1">{selectedRequest.user_name || selectedRequest.user_email}</p>
                  </div>
                  <div>
                    <Label>Submitted On</Label>
                    <p className="mt-1">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Votes</Label>
                    <p className="mt-1">{selectedRequest.upvotes || 0}</p>
                  </div>
                  <div>
                    <Label>Last Updated</Label>
                    <p className="mt-1">{new Date(selectedRequest.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    await updateRequestStatus(selectedRequest.id, {
                      status: selectedRequest.status,
                      priority: selectedRequest.priority,
                      admin_notes: adminNotes
                    })
                    setDialogOpen(false)
                  }}
                  disabled={updatingStatus === selectedRequest.id}
                >
                  {updatingStatus === selectedRequest.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Feature Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Feature Request</DialogTitle>
            <DialogDescription>
              Submit a new feature request or enhancement idea
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="feature">Feature Description *</Label>
              <Input
                id="feature"
                value={createFormData.requestedFeature}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, requestedFeature: e.target.value }))}
                placeholder="Brief description of the feature"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="reason">Reason / Justification *</Label>
              <Textarea
                id="reason"
                value={createFormData.reason}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Why is this feature needed? What problem does it solve?"
                className="mt-1 min-h-[100px]"
              />
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={createFormData.priority} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, priority: value as FeatureRequest['priority'] }))}
              >
                <SelectTrigger id="priority" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFeatureRequest}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Feature Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AdminFeatureRequestsPage() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6">
        <AdminFeatureRequestsContent />
      </div>
    </ErrorBoundary>
  )
}