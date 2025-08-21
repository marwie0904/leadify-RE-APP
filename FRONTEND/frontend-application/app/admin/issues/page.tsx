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
  AlertTriangle,
  MoreVertical,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Bug,
  Zap,
  Shield,
  AlertCircle,
  Filter,
  Search,
  Archive,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Loader2,
  Plus
} from "lucide-react"
import { toast } from "sonner"

interface Issue {
  id: string
  subject: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  category: 'bug' | 'feature_request' | 'performance' | 'security' | 'other'
  user_email: string
  user_name: string | null
  organization_id: string | null
  assigned_to: string | null
  ai_priority_score: number
  ai_classification: {
    priority: string
    priorityScore: number
    category: string
    suggestedActions: string[]
    reasoning: string
  }
  posthog_session_id: string | null
  posthog_recording_url: string | null
  browser_info: any
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolution_notes: string | null
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent':
      return <AlertTriangle className="h-4 w-4" />
    case 'high':
      return <AlertCircle className="h-4 w-4" />
    case 'medium':
      return <Zap className="h-4 w-4" />
    case 'low':
      return <Clock className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'bug':
      return <Bug className="h-4 w-4" />
    case 'feature_request':
      return <Lightbulb className="h-4 w-4" />
    case 'performance':
      return <Zap className="h-4 w-4" />
    case 'security':
      return <Shield className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'in_progress':
      return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function AdminIssuesContent() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [newIssueIds, setNewIssueIds] = useState<Set<string>>(new Set())
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as Issue['priority'],
    category: 'bug' as Issue['category']
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchIssues()
    
    // Set up auto-refresh every 10 seconds for more responsive updates
    const interval = setInterval(() => {
      fetchIssues(true) // silent refresh
    }, 10000)
    
    // Also refresh when window regains focus
    const handleFocus = () => {
      fetchIssues(true) // silent refresh
    }
    window.addEventListener('focus', handleFocus)
    
    // Listen for custom event when new issue is reported
    const handleNewIssue = () => {
      setTimeout(() => {
        fetchIssues(false) // visible refresh to show the new issue
      }, 1000) // Small delay to ensure the issue is saved in the database
    }
    window.addEventListener('newIssueReported', handleNewIssue)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('newIssueReported', handleNewIssue)
    }
  }, [])

  const fetchIssues = async (silent = false) => {
    // Remove user check for testing - in production, this should require authentication
    // if (!user) return

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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/issues`, {
        headers
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to fetch issues')
      }

      const data = await response.json()
      console.log('[Admin Issues] API Response:', data)
      
      if (data.success && data.data) {
        // The API returns data.data.issues for the array of issues
        const issuesData = data.data.issues || data.data
        const issuesArray: Issue[] = Array.isArray(issuesData) ? issuesData : []
        console.log('[Admin Issues] Issues array:', issuesArray)
        const sortedIssues = [...issuesArray].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        // Find truly new issues (not in the previous list)
        const previousIssueIds = new Set(issues.map(i => i.id))
        const newlyAddedIssues = sortedIssues.filter((issue) => !previousIssueIds.has(issue.id))
        
        // Track new issue IDs for highlighting
        if (newlyAddedIssues.length > 0) {
          const newIds = new Set(newlyAddedIssues.map((i) => i.id))
          setNewIssueIds(newIds)
          
          // Clear highlighting after 5 seconds
          setTimeout(() => {
            setNewIssueIds(new Set())
          }, 5000)
        }
        
        // Always update the issues list
        setIssues(sortedIssues)
        setLastRefreshed(new Date())
        
        // Show toast for new issues
        if (newlyAddedIssues.length > 0) {
          if (!silent) {
            toast.success(`${newlyAddedIssues.length} new issue(s) found`)
          } else {
            // Even for silent refresh, show a subtle notification for new issues
            toast.info(`${newlyAddedIssues.length} new issue(s) detected`, {
              duration: 3000
            })
          }
        }
      } else {
        throw new Error('Invalid data format')
      }
    } catch (err) {
      console.error('Error fetching issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issues')
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Failed to load issues')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }

  const handleCreateIssue = async () => {
    if (!createFormData.subject || !createFormData.description) {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: createFormData.subject,
          description: createFormData.description,
          priority: createFormData.priority,
          category: createFormData.category,
          browser_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create issue')
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success('Issue created successfully')
        setShowCreateDialog(false)
        setCreateFormData({
          subject: '',
          description: '',
          priority: 'medium',
          category: 'bug'
        })
        // Refresh issues list
        fetchIssues()
      }
    } catch (err) {
      console.error('Error creating issue:', err)
      toast.error('Failed to create issue')
    } finally {
      setIsCreating(false)
    }
  }

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    setUpdatingStatus(issueId)
    
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/issues/${issueId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update issue status')
      }

      const data = await response.json()
      if (data.success) {
        // Update local state
        setIssues(prev => prev.map(issue => 
          issue.id === issueId ? { ...issue, status: newStatus as Issue['status'] } : issue
        ))
        toast.success('Issue status updated')
      }
    } catch (err) {
      console.error('Error updating issue:', err)
      toast.error('Failed to update issue status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredIssues = issues.filter(issue => {
    const matchesPriority = filterPriority === "all" || issue.priority === filterPriority
    const matchesStatus = filterStatus === "all" || issue.status === filterStatus
    const matchesSearch = searchQuery === "" || 
      issue.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesPriority && matchesStatus && matchesSearch
  })

  const urgentCount = issues.filter(i => i.priority === 'urgent').length
  const openCount = issues.filter(i => i.status === 'open').length
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Issues & Bug Reports</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage reported issues from users
            {lastRefreshed && (
              <span className="text-sm text-gray-500 ml-2">
                • Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            {isRefreshing && (
              <span className="text-sm text-blue-600 ml-2 animate-pulse">
                • Checking for updates...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Auto-refresh: 10s
          </Badge>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Issue
          </Button>
          <Button onClick={() => fetchIssues()} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Refresh Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-900">Urgent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <p className="text-xs text-red-700 mt-1">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openCount}</div>
            <p className="text-xs text-blue-700 mt-1">Awaiting assignment</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{inProgressCount}</div>
            <p className="text-xs text-purple-700 mt-1">Being worked on</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <Label htmlFor="priority">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issues ({filteredIssues.length})</CardTitle>
          <CardDescription>Click on an issue to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No issues found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all ${
                    newIssueIds.has(issue.id) 
                      ? 'bg-green-50 border-green-400 animate-pulse' 
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedIssue(issue)
                    setDialogOpen(true)
                  }}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-full ${getPriorityColor(issue.priority).replace('text-', 'bg-').replace('800', '100')}`}>
                      {getPriorityIcon(issue.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{issue.subject}</h3>
                        {newIssueIds.has(issue.id) && (
                          <Badge className="bg-green-600 text-white animate-bounce">
                            NEW
                          </Badge>
                        )}
                        <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                          {issue.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(issue.status)}>
                          {issue.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex items-center gap-1 text-gray-500">
                          {getCategoryIcon(issue.category)}
                          <span className="text-xs">{issue.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{issue.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {issue.user_name || issue.user_email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                        {issue.posthog_session_id && (
                          <span className="flex items-center text-green-600">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Has recording
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" disabled={updatingStatus === issue.id}>
                        {updatingStatus === issue.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          updateIssueStatus(issue.id, 'open')
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          updateIssueStatus(issue.id, 'in_progress')
                        }}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          updateIssueStatus(issue.id, 'resolved')
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          updateIssueStatus(issue.id, 'closed')
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Closed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getPriorityIcon(selectedIssue.priority)}
                  {selectedIssue.subject}
                </DialogTitle>
                <DialogDescription>
                  Reported by {selectedIssue.user_name || selectedIssue.user_email} on {new Date(selectedIssue.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className={getPriorityColor(selectedIssue.priority)}>
                    Priority: {selectedIssue.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(selectedIssue.status)}>
                    Status: {selectedIssue.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    {getCategoryIcon(selectedIssue.category)}
                    <span className="ml-1">{selectedIssue.category.replace('_', ' ')}</span>
                  </Badge>
                </div>

                <div>
                  <Label>Description</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedIssue.description}</p>
                  </div>
                </div>

                {selectedIssue.ai_classification && (
                  <div>
                    <Label>AI Analysis</Label>
                    <div className="mt-1 space-y-2">
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-900 font-medium mb-2">Reasoning:</p>
                        <p className="text-sm text-blue-700">{selectedIssue.ai_classification.reasoning}</p>
                      </div>
                      {selectedIssue.ai_classification.suggestedActions?.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-md">
                          <p className="text-sm text-green-900 font-medium mb-2">Suggested Actions:</p>
                          <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                            {selectedIssue.ai_classification.suggestedActions.map((action, idx) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedIssue.posthog_recording_url && (
                  <div>
                    <Label>Session Recording</Label>
                    <div className="mt-1">
                      <a
                        href={selectedIssue.posthog_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View PostHog Recording
                      </a>
                    </div>
                  </div>
                )}

                {selectedIssue.browser_info && (
                  <div>
                    <Label>Browser Information</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Platform:</span> {selectedIssue.browser_info.platform}
                        </div>
                        <div>
                          <span className="text-gray-500">Language:</span> {selectedIssue.browser_info.language}
                        </div>
                        {selectedIssue.browser_info.screenResolution && (
                          <div>
                            <span className="text-gray-500">Screen:</span> {selectedIssue.browser_info.screenResolution}
                          </div>
                        )}
                        {selectedIssue.browser_info.viewport && (
                          <div>
                            <span className="text-gray-500">Viewport:</span> {selectedIssue.browser_info.viewport}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Issue Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report New Issue</DialogTitle>
            <DialogDescription>
              Create a new issue or bug report
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={createFormData.subject}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Brief description of the issue"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the issue..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={createFormData.priority} 
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, priority: value as Issue['priority'] }))}
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
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={createFormData.category} 
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, category: value as Issue['category'] }))}
                >
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              onClick={handleCreateIssue}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Issue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminIssuesPage() {
  return (
    <ErrorBoundary>
      <AdminIssuesContent />
    </ErrorBoundary>
  )
}