"use client"

import React, { useState, useEffect, Fragment } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Target,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Clock,
  Building,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ArrowUpDown,
  Star,
  Globe,
  Facebook,
  Code,
  MessageCircle,
  TrendingUp,
  Award,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockLeadsData } from "@/lib/test-data"

interface Lead {
  id: string
  organization_id: string
  agent_id: string
  agent_name: string
  name: string
  email: string
  phone?: string
  source: string
  status: string
  score?: number
  notes?: string
  created_at: string
  updated_at: string
  // BANT fields
  budget?: string
  authority?: string
  need?: string
  timeline?: string
  bant_score?: number
  // Additional metadata
  property_type?: string
  location?: string
  conversation_count?: number
  last_contact?: string
  lead_classification?: string
}

interface LeadStats {
  total_leads: number
  qualified_leads: number
  hot_leads: number
  cold_leads: number
  average_score: number
  conversion_rate: number
  leads_by_source: Record<string, number>
  leads_by_status: Record<string, number>
}

export default function OrganizationLeadsPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "score" | "name">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())
  
  const fetchLeads = async () => {
    try {
      // Check for test mode
      const isTestMode = typeof window !== 'undefined' && localStorage.getItem('test_mode') === 'true'
      
      if (isTestMode) {
        // Use mock data in test mode with comprehensive field mapping
        const processedLeads = mockLeadsData.leads.map((lead: any) => ({
          ...lead,
          name: lead.name || lead.full_name || 'Unknown',
          phone: lead.phone || lead.phone_number || lead.mobile_number || lead.mobile || 'No phone',
          score: lead.bant_score || lead.score || lead.lead_score || 0,
          status: lead.status || lead.lead_classification || 'new'
        }))
        
        // Calculate statistics
        const qualifiedCount = processedLeads.filter(l => (l.score || 0) >= 70).length
        const hotCount = processedLeads.filter(l => (l.score || 0) >= 80).length
        const coldCount = processedLeads.filter(l => (l.score || 0) < 50).length
        const totalScore = processedLeads.reduce((sum, l) => sum + (l.score || 0), 0)
        
        const sourceCounts = processedLeads.reduce((acc, lead) => {
          acc[lead.source] = (acc[lead.source] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const statusCounts = processedLeads.reduce((acc, lead) => {
          acc[lead.status || 'new'] = (acc[lead.status || 'new'] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const calculatedStats: LeadStats = {
          total_leads: processedLeads.length,
          qualified_leads: qualifiedCount,
          hot_leads: hotCount,
          cold_leads: coldCount,
          average_score: processedLeads.length > 0 
            ? Math.round(totalScore / processedLeads.length) 
            : 0,
          conversion_rate: processedLeads.length > 0
            ? (qualifiedCount / processedLeads.length * 100)
            : 0,
          leads_by_source: sourceCounts,
          leads_by_status: statusCounts
        }
        
        setLeads(processedLeads)
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
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/leads`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }
      
      const data = await response.json()
      
      // Process leads data with comprehensive field mapping
      const processedLeads: Lead[] = data.leads?.map((lead: any) => ({
        ...lead,
        name: lead.name || lead.full_name || 'Unknown',
        phone: lead.phone || lead.phone_number || lead.mobile_number || lead.mobile || 'No phone',
        agent_name: lead.agent?.name || lead.agent_name || 'Unknown Agent',
        bant_score: calculateBANTScore(lead),
        score: lead.score || lead.lead_score || calculateBANTScore(lead),
        status: lead.status || lead.lead_classification || 'new'
      })) || []
      
      // Calculate statistics
      const qualifiedCount = processedLeads.filter(l => (l.score || 0) >= 70).length
      const hotCount = processedLeads.filter(l => (l.score || 0) >= 80).length
      const coldCount = processedLeads.filter(l => (l.score || 0) < 50).length
      const totalScore = processedLeads.reduce((sum, l) => sum + (l.score || 0), 0)
      
      const sourceCounts = processedLeads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const statusCounts = processedLeads.reduce((acc, lead) => {
        acc[lead.status || 'new'] = (acc[lead.status || 'new'] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const calculatedStats: LeadStats = {
        total_leads: processedLeads.length,
        qualified_leads: qualifiedCount,
        hot_leads: hotCount,
        cold_leads: coldCount,
        average_score: processedLeads.length > 0 
          ? Math.round(totalScore / processedLeads.length) 
          : 0,
        conversion_rate: processedLeads.length > 0
          ? (qualifiedCount / processedLeads.length * 100)
          : 0,
        leads_by_source: sourceCounts,
        leads_by_status: statusCounts
      }
      
      setLeads(processedLeads)
      setStats(calculatedStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchLeads()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    fetchLeads()
  }
  
  // Calculate BANT score based on available fields
  const calculateBANTScore = (lead: any): number => {
    let score = 0
    let factors = 0
    
    if (lead.budget) {
      score += 25
      factors++
    }
    if (lead.authority) {
      score += 25
      factors++
    }
    if (lead.need) {
      score += 25
      factors++
    }
    if (lead.timeline) {
      score += 25
      factors++
    }
    
    // If no BANT data, use a random score for demo
    if (factors === 0) {
      return Math.floor(Math.random() * 100)
    }
    
    return score
  }
  
  // Filter and sort leads
  const filteredLeads = leads
    .filter(lead => {
      if (searchTerm && 
          !lead.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !lead.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !lead.phone?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false
      }
      if (sourceFilter !== "all" && lead.source !== sourceFilter) {
        return false
      }
      if (scoreFilter !== "all") {
        const score = lead.score || 0
        if (scoreFilter === "hot" && score < 80) return false
        if (scoreFilter === "warm" && (score < 50 || score >= 80)) return false
        if (scoreFilter === "cold" && score >= 50) return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "score":
          comparison = (a.score || 0) - (b.score || 0)
          break
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })
  
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'web':
        return <Globe className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'embed':
        return <Code className="h-4 w-4" />
      case 'api':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot'
    if (score >= 50) return 'Warm'
    return 'Cold'
  }
  
  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'priority':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'hot':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'warm':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'cold':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'contacted':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'new':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'nurturing':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'lost':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
              fetchLeads()
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
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_leads}</div>
              <div className="text-sm text-gray-500 mt-1">
                All captured leads
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Qualified Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.qualified_leads}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Score ≥ 70
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Award className="h-5 w-5 mr-2 text-orange-500" />
                {stats.average_score}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                BANT qualification
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                {stats.conversion_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Lead to qualified
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Lead Temperature Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Temperature</CardTitle>
            <CardDescription>Distribution of leads by qualification score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{stats.hot_leads}</div>
                <div className="text-sm text-green-700 mt-1">Hot Leads (80+)</div>
                <Progress 
                  value={(stats.hot_leads / stats.total_leads) * 100} 
                  className="mt-2 h-2"
                />
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.total_leads - stats.hot_leads - stats.cold_leads}
                </div>
                <div className="text-sm text-yellow-700 mt-1">Warm Leads (50-79)</div>
                <Progress 
                  value={((stats.total_leads - stats.hot_leads - stats.cold_leads) / stats.total_leads) * 100} 
                  className="mt-2 h-2"
                />
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">{stats.cold_leads}</div>
                <div className="text-sm text-gray-700 mt-1">Cold Leads (&lt;50)</div>
                <Progress 
                  value={(stats.cold_leads / stats.total_leads) * 100} 
                  className="mt-2 h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Leads</CardTitle>
              <CardDescription>Complete list of captured leads with BANT scoring</CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="nurturing">Nurturing</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="embed">Embed</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Temperature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Temps</SelectItem>
                <SelectItem value="hot">Hot (80+)</SelectItem>
                <SelectItem value="warm">Warm (50-79)</SelectItem>
                <SelectItem value="cold">Cold (&lt;50)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="name">Name</SelectItem>
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
          
          {/* Table */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No leads found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Agent Assigned</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <Fragment key={lead.id}>
                      <TableRow>
                      <TableCell>
                        <div className="font-medium">
                          {lead.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {lead.phone || 'No phone'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div 
                            className={cn(
                              "text-2xl font-bold px-3 py-1 rounded",
                              getScoreColor(lead.score || 0)
                            )}
                          >
                            {lead.score || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getClassificationColor(lead.lead_classification || getScoreLabel(lead.score || 0))}>
                          {lead.lead_classification || getScoreLabel(lead.score || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.agent_name || 'Unassigned'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(lead.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(lead.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedLeads)
                            if (newExpanded.has(lead.id)) {
                              newExpanded.delete(lead.id)
                            } else {
                              newExpanded.add(lead.id)
                            }
                            setExpandedLeads(newExpanded)
                          }}
                          data-testid="expand-bant"
                        >
                          {expandedLeads.has(lead.id) ? (
                            <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 transition-transform" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedLeads.has(lead.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-gray-50">
                          <div className="p-6 space-y-6">
                            {/* BANT Details Section */}
                            <div>
                              <h4 className="font-semibold text-lg mb-4 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-blue-500" />
                                BANT Qualification Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Budget */}
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                                    <span className="font-medium">Budget</span>
                                  </div>
                                  <div className="pl-6">
                                    <div className="text-sm text-gray-600">
                                      {lead.budget || 'Not specified'}
                                    </div>
                                    <div className="mt-2">
                                      <Progress value={lead.budget ? 25 : 0} className="h-2" />
                                      <span className="text-xs text-gray-500">Score: {lead.budget ? '25/25' : '0/25'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Authority */}
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2 text-purple-500" />
                                    <span className="font-medium">Authority</span>
                                  </div>
                                  <div className="pl-6">
                                    <div className="text-sm text-gray-600">
                                      {lead.authority || 'Not specified'}
                                    </div>
                                    <div className="mt-2">
                                      <Progress value={lead.authority ? 25 : 0} className="h-2" />
                                      <span className="text-xs text-gray-500">Score: {lead.authority ? '25/25' : '0/25'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Need */}
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <Briefcase className="h-4 w-4 mr-2 text-orange-500" />
                                    <span className="font-medium">Need</span>
                                  </div>
                                  <div className="pl-6">
                                    <div className="text-sm text-gray-600">
                                      {lead.need || 'Not specified'}
                                    </div>
                                    <div className="mt-2">
                                      <Progress value={lead.need ? 25 : 0} className="h-2" />
                                      <span className="text-xs text-gray-500">Score: {lead.need ? '25/25' : '0/25'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Timeline */}
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-red-500" />
                                    <span className="font-medium">Timeline</span>
                                  </div>
                                  <div className="pl-6">
                                    <div className="text-sm text-gray-600">
                                      {lead.timeline || 'Not specified'}
                                    </div>
                                    <div className="mt-2">
                                      <Progress value={lead.timeline ? 25 : 0} className="h-2" />
                                      <span className="text-xs text-gray-500">Score: {lead.timeline ? '25/25' : '0/25'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Details */}
                            <div className="border-t pt-6">
                              <h4 className="font-semibold text-lg mb-4">Additional Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <div className="space-y-3">
                                    {lead.property_type && (
                                      <div className="flex items-start">
                                        <Building className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <div>
                                          <span className="text-sm font-medium">Property Type:</span>
                                          <span className="text-sm text-gray-600 ml-2">{lead.property_type}</span>
                                        </div>
                                      </div>
                                    )}
                                    {lead.location && (
                                      <div className="flex items-start">
                                        <Globe className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <div>
                                          <span className="text-sm font-medium">Location Preference:</span>
                                          <span className="text-sm text-gray-600 ml-2">{lead.location}</span>
                                        </div>
                                      </div>
                                    )}
                                    {lead.conversation_count !== undefined && (
                                      <div className="flex items-start">
                                        <MessageCircle className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <div>
                                          <span className="text-sm font-medium">Conversations:</span>
                                          <span className="text-sm text-gray-600 ml-2">{lead.conversation_count || 0}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  {lead.notes && (
                                    <div>
                                      <div className="flex items-start mb-2">
                                        <FileText className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <span className="text-sm font-medium">Notes:</span>
                                      </div>
                                      <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                        {lead.notes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Lead Classification & Summary */}
                            <div className="border-t pt-6">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-semibold text-lg mb-2">Lead Summary</h4>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium mr-2">Classification:</span>
                                      <Badge className={cn(
                                        "capitalize",
                                        lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                                        lead.status === 'hot' ? 'bg-red-100 text-red-700' :
                                        lead.status === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                      )}>
                                        {lead.status || 'new'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium mr-2">Temperature:</span>
                                      <Badge className={cn(
                                        getScoreColor(lead.score || 0),
                                        "font-bold"
                                      )}>
                                        {getScoreLabel(lead.score || 0)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-3xl font-bold" style={{
                                    color: lead.score >= 80 ? '#16a34a' : 
                                           lead.score >= 50 ? '#ca8a04' : 
                                           '#6b7280'
                                  }}>
                                    {lead.score || 0}%
                                  </div>
                                  <div className="text-sm text-gray-500">Overall BANT Score</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}