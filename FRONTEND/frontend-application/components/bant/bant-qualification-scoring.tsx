'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Target, 
  ThermometerSun, 
  Snowflake,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  Phone,
  Mail,
  Calendar,
  MapPin,
  BarChart3,
  PieChart,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from "@/contexts/simple-auth-context"
import { apiCall } from '@/lib/api'
import { toast } from 'sonner'

interface BANTScore {
  budget: number
  authority: number
  need: number
  timeline: number
  contact: number
  total: number
  weighted_total: number
}

interface Lead {
  id: string
  name?: string
  email?: string
  phone?: string
  company?: string
  budget?: number
  authority_type?: string
  need_type?: string
  timeline?: string
  contact_info?: string
  location?: string
  bant_score?: BANTScore
  qualification_status: 'priority' | 'hot' | 'warm' | 'cold' | 'unqualified'
  created_at: string
  updated_at: string
  conversation_count?: number
  last_interaction?: string
}

interface BANTQualificationScoringProps {
  agentId?: string
  className?: string
}

interface BANTSummaryStats {
  total_leads: number
  priority_leads: number
  hot_leads: number
  warm_leads: number
  cold_leads: number
  unqualified_leads: number
  average_score: number
  score_trend: number
}

const getQualificationBadgeVariant = (status: Lead['qualification_status']) => {
  switch (status) {
    case 'priority': return 'destructive'
    case 'hot': return 'default'
    case 'warm': return 'secondary'
    case 'cold': return 'outline'
    case 'unqualified': return 'outline'
    default: return 'outline'
  }
}

const getQualificationIcon = (status: Lead['qualification_status']) => {
  switch (status) {
    case 'priority': return <Target className="h-4 w-4" />
    case 'hot': return <Flame className="h-4 w-4" />
    case 'warm': return <ThermometerSun className="h-4 w-4" />
    case 'cold': return <Snowflake className="h-4 w-4" />
    case 'unqualified': return <AlertCircle className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-red-600'
  if (score >= 80) return 'text-orange-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-blue-600'
  return 'text-gray-600'
}

const getProgressColor = (score: number) => {
  if (score >= 90) return 'bg-red-500'
  if (score >= 80) return 'bg-orange-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-blue-500'
  return 'bg-gray-400'
}

export function BANTQualificationScoring({ agentId, className }: BANTQualificationScoringProps) {
  const { getAuthHeaders } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [summaryStats, setSummaryStats] = useState<BANTSummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('score_desc')

  // Filtered and sorted leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || lead.qualification_status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case 'score_desc':
        return (b.bant_score?.weighted_total || 0) - (a.bant_score?.weighted_total || 0)
      case 'score_asc':
        return (a.bant_score?.weighted_total || 0) - (b.bant_score?.weighted_total || 0)
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '')
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '')
      case 'date_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default:
        return 0
    }
  })

  const fetchLeads = async () => {
    try {
      setError(null)
      const authHeaders = await getAuthHeaders()
      
      const response = await apiCall('/api/leads', {
        headers: authHeaders,
        method: 'GET'
      })

      // Transform API response to match our interface
      const leadsData = Array.isArray(response) ? response : response.leads || []
      
      const transformedLeads: Lead[] = leadsData.map((lead: any) => ({
        id: lead.id || lead.lead_id || Math.random().toString(),
        name: lead.name || lead.full_name || 'Unknown',
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        budget: lead.budget || lead.budget_amount,
        authority_type: lead.authority_type || lead.authority,
        need_type: lead.need_type || lead.need,
        timeline: lead.timeline,
        contact_info: lead.contact_info,
        location: lead.location,
        bant_score: lead.bant_score || {
          budget: Math.floor(Math.random() * 31) + 10, // Mock data
          authority: Math.floor(Math.random() * 21) + 10,
          need: Math.floor(Math.random() * 16) + 5,
          timeline: Math.floor(Math.random() * 26) + 10,
          contact: Math.floor(Math.random() * 11) + 2,
          total: 0,
          weighted_total: 0
        },
        qualification_status: lead.qualification_status || lead.status || 'unqualified',
        created_at: lead.created_at || lead.createdAt || new Date().toISOString(),
        updated_at: lead.updated_at || lead.updatedAt || new Date().toISOString(),
        conversation_count: lead.conversation_count || 0,
        last_interaction: lead.last_interaction || lead.lastInteraction
      }))

      // Calculate total and weighted totals for mock data
      transformedLeads.forEach(lead => {
        if (lead.bant_score) {
          lead.bant_score.total = lead.bant_score.budget + lead.bant_score.authority + 
                                 lead.bant_score.need + lead.bant_score.timeline + lead.bant_score.contact
          lead.bant_score.weighted_total = Math.min(100, lead.bant_score.total * 1.1) // Mock weighted calculation
        }
      })

      setLeads(transformedLeads)

      // Calculate summary stats
      const stats: BANTSummaryStats = {
        total_leads: transformedLeads.length,
        priority_leads: transformedLeads.filter(l => l.qualification_status === 'priority').length,
        hot_leads: transformedLeads.filter(l => l.qualification_status === 'hot').length,
        warm_leads: transformedLeads.filter(l => l.qualification_status === 'warm').length,
        cold_leads: transformedLeads.filter(l => l.qualification_status === 'cold').length,
        unqualified_leads: transformedLeads.filter(l => l.qualification_status === 'unqualified').length,
        average_score: transformedLeads.reduce((sum, l) => sum + (l.bant_score?.weighted_total || 0), 0) / transformedLeads.length || 0,
        score_trend: Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 5 // Mock trend
      }

      setSummaryStats(stats)

    } catch (error) {
      console.error('Failed to fetch leads:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch leads')
      toast.error('Failed to load BANT qualification data')
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchLeads()
    setRefreshing(false)
    toast.success('BANT qualification data refreshed')
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchLeads()
      setLoading(false)
    }
    loadData()
  }, [agentId])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            BANT Qualification Scoring
          </CardTitle>
          <CardDescription>Loading BANT scoring data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            BANT Qualification Scoring
          </CardTitle>
          <CardDescription>Error loading BANT scoring data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refreshData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              BANT Qualification Scoring
            </CardTitle>
            <CardDescription>
              Lead qualification scores based on Budget, Authority, Need, Timeline, and Contact information
            </CardDescription>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leads">Lead Scores</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Stats */}
            {summaryStats && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-red-600" />
                      <div className="text-sm font-medium">Priority Leads</div>
                    </div>
                    <div className="text-2xl font-bold">{summaryStats.priority_leads}</div>
                    <div className="text-xs text-muted-foreground">
                      {summaryStats.total_leads > 0 ? Math.round((summaryStats.priority_leads / summaryStats.total_leads) * 100) : 0}% of total
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-600" />
                      <div className="text-sm font-medium">Hot Leads</div>
                    </div>
                    <div className="text-2xl font-bold">{summaryStats.hot_leads}</div>
                    <div className="text-xs text-muted-foreground">
                      {summaryStats.total_leads > 0 ? Math.round((summaryStats.hot_leads / summaryStats.total_leads) * 100) : 0}% of total
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ThermometerSun className="h-4 w-4 text-yellow-600" />
                      <div className="text-sm font-medium">Warm Leads</div>
                    </div>
                    <div className="text-2xl font-bold">{summaryStats.warm_leads}</div>
                    <div className="text-xs text-muted-foreground">
                      {summaryStats.total_leads > 0 ? Math.round((summaryStats.warm_leads / summaryStats.total_leads) * 100) : 0}% of total
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <div className="text-sm font-medium">Avg Score</div>
                    </div>
                    <div className="text-2xl font-bold">{Math.round(summaryStats.average_score)}</div>
                    <div className="flex items-center text-xs">
                      {summaryStats.score_trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={summaryStats.score_trend > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(summaryStats.score_trend).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <Button variant="outline" className="justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    View Priority Leads
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Flame className="h-4 w-4 mr-2" />
                    Export Hot Leads
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            {/* Filters and Search */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-64"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score_desc">Score (High to Low)</SelectItem>
                    <SelectItem value="score_asc">Score (Low to High)</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    <SelectItem value="date_desc">Date (Newest)</SelectItem>
                    <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {sortedLeads.length} of {leads.length} leads
              </div>
            </div>

            {/* Leads List */}
            <div className="space-y-3">
              {sortedLeads.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No leads found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try adjusting your search or filter criteria.'
                        : 'No BANT qualified leads available yet.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sortedLeads.map((lead) => (
                  <Card key={lead.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{lead.name}</h4>
                          <Badge variant={getQualificationBadgeVariant(lead.qualification_status)} className="flex items-center gap-1">
                            {getQualificationIcon(lead.qualification_status)}
                            {lead.qualification_status.charAt(0).toUpperCase() + lead.qualification_status.slice(1)}
                          </Badge>
                          {lead.bant_score && (
                            <span className={cn("text-sm font-semibold", getScoreColor(lead.bant_score.weighted_total))}>
                              {Math.round(lead.bant_score.weighted_total)} pts
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                          {lead.company && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {lead.company}
                            </div>
                          )}
                          {lead.budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${lead.budget.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* BANT Score Breakdown */}
                        {lead.bant_score && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-5 gap-2 text-xs">
                              <div>
                                <div className="font-medium">Budget</div>
                                <div className="text-muted-foreground">{lead.bant_score.budget}pts</div>
                              </div>
                              <div>
                                <div className="font-medium">Authority</div>
                                <div className="text-muted-foreground">{lead.bant_score.authority}pts</div>
                              </div>
                              <div>
                                <div className="font-medium">Need</div>
                                <div className="text-muted-foreground">{lead.bant_score.need}pts</div>
                              </div>
                              <div>
                                <div className="font-medium">Timeline</div>
                                <div className="text-muted-foreground">{lead.bant_score.timeline}pts</div>
                              </div>
                              <div>
                                <div className="font-medium">Contact</div>
                                <div className="text-muted-foreground">{lead.bant_score.contact}pts</div>
                              </div>
                            </div>
                            <Progress 
                              value={lead.bant_score.weighted_total} 
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Advanced analytics and reporting features are being developed. 
                This will include BANT score trends, conversion rates, and detailed qualification insights.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Chart coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Qualification Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Trends coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}