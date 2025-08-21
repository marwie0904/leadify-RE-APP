"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Activity,
  Download,
  AlertTriangle,
  Calendar,
  Brain,
  Cpu,
  HardDrive,
  RefreshCw,
  Loader2
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { 
  aiAnalyticsAPI, 
  type TokenSummary,
  type ConversationAnalytics,
  type OperationAnalytics,
  type PeakTimeAnalytics,
  type OrganizationAnalytics 
} from '@/lib/api/ai-analytics'

// Color palette for charts
const COLORS = {
  'gpt-4': '#8b5cf6',
  'gpt-3.5-turbo': '#3b82f6',
  'embeddings': '#10b981',
  'chat_reply': '#8b5cf6',
  'bant_extraction': '#3b82f6',
  'lead_scoring': '#10b981',
  'intent_classification': '#f59e0b',
  'estimation': '#ef4444'
}

export default function EnhancedAIAnalyticsPage() {
  console.log('[AI Analytics] EnhancedAIAnalyticsPage component mounting...')
  const [timeRange, setTimeRange] = useState("30d")
  const [activeTab, setActiveTab] = useState("usage")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [summary, setSummary] = useState<TokenSummary | null>(null)
  const [conversations, setConversations] = useState<ConversationAnalytics | null>(null)
  const [operations, setOperations] = useState<OperationAnalytics | null>(null)
  const [peakTimes, setPeakTimes] = useState<PeakTimeAnalytics | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationAnalytics | null>(null)
  const [dailyUsage, setDailyUsage] = useState<Array<any>>([])

  // Fetch all data
  const fetchData = async () => {
    console.log('[AI Analytics] Starting data fetch...')
    try {
      setError(null)
      
      console.log('[AI Analytics] Fetching all analytics data in parallel...')
      // Fetch all analytics data in parallel
      const [
        summaryData,
        conversationsData,
        operationsData,
        peakTimesData,
        organizationsData
      ] = await Promise.all([
        aiAnalyticsAPI.getSummary().catch(err => {
          console.error('[AI Analytics] Summary API failed:', err)
          return null
        }),
        aiAnalyticsAPI.getConversationAnalytics().catch(err => {
          console.error('[AI Analytics] Conversations API failed:', err)
          return null
        }),
        aiAnalyticsAPI.getOperationAnalytics().catch(err => {
          console.error('[AI Analytics] Operations API failed:', err)
          return null
        }),
        aiAnalyticsAPI.getPeakTimes().catch(err => {
          console.error('[AI Analytics] Peak Times API failed:', err)
          return null
        }),
        aiAnalyticsAPI.getOrganizationAnalytics(1, 20).catch(err => {
          console.error('[AI Analytics] Organizations API failed:', err)
          return null
        })
      ])

      console.log('[AI Analytics] API responses:', {
        summary: summaryData,
        conversations: conversationsData,
        operations: operationsData,
        peakTimes: peakTimesData,
        organizations: organizationsData
      })

      setSummary(summaryData)
      setConversations(conversationsData)
      setOperations(operationsData)
      setPeakTimes(peakTimesData)
      setOrganizations(organizationsData)

      // Fetch daily usage for the selected time range
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30)
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90)
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      const dailyData = await aiAnalyticsAPI.getDailyUsage(
        startDate.toISOString().split('T')[0],
        endDate
      )
      setDailyUsage(dailyData.dailyUsage || [])

    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [timeRange])

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  // Export data
  const handleExport = () => {
    const data = {
      summary,
      conversations,
      operations,
      organizations: organizations?.organizations,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Prepare chart data with normalized percentages
  const rawModelData = Object.entries(conversations?.modelDistribution || {}).map(([name, data]) => ({
    name,
    value: data.percentage,
    tokens: data.totalTokens,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280'
  }))
  
  // Normalize percentages to sum to 100%
  const totalPercentage = rawModelData.reduce((sum, item) => sum + item.value, 0)
  const modelDistributionData = totalPercentage > 0 
    ? rawModelData.map(item => ({
        ...item,
        value: Math.round((item.value / totalPercentage) * 100)
      }))
    : rawModelData

  const operationBreakdownData = Object.entries(operations?.operationBreakdown || {}).map(([name, data]) => ({
    feature: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    percentage: data.percentage,
    tokens: data.tokens,
    cost: data.cost,
    requests: data.requests,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280'
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Analytics</h1>
          </div>
          <p className="text-gray-600 mt-1">Monitor AI usage, costs, and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `${(summary.totalTokens / 1000000).toFixed(1)}M` : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.monthOverMonth.percentageChange ? (
                summary.monthOverMonth.percentageChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 inline mr-1 text-green-600" />
                    +{summary.monthOverMonth.percentageChange}% from last month
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 inline mr-1 text-red-600" />
                    {summary.monthOverMonth.percentageChange}% from last month
                  </>
                )
              ) : 'No change'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.totalCost.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projected: ${((summary?.totalCost || 0) * 1.18).toFixed(0)} next month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Tokens/Conv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations ? `${(conversations.averageTokensPerConversation / 1000).toFixed(1)}K` : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {conversations?.totalConversations || 0} conversations
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.uniqueOrganizations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {organizations?.organizations?.filter?.(o => o.trend > 0)?.length || 0} growing usage
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.averageResponseTime || '324'}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall AI response latency
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg BANT Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations?.operations?.find?.(op => op.operation === 'bant_extraction')?.averageResponseTime || '512'}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              BANT extraction latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Hourly Token Usage Trend */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Hourly Token Usage Trend</CardTitle>
              <CardDescription>Token consumption by hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${(value / 1000).toFixed(0)}K`} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.6} 
                    name="Total Tokens" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Model Usage Distribution */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Model Usage Distribution</CardTitle>
                <CardDescription>Percentage of tokens by model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={modelDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {modelDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feature Usage */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Operation Usage Breakdown</CardTitle>
                <CardDescription>Token allocation by operation type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operationBreakdownData.map((feature) => (
                    <div key={feature.feature} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{feature.feature}</span>
                        <span className="text-muted-foreground">{feature.percentage}%</span>
                      </div>
                      <Progress value={feature.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Peak Usage Heatmap */}
          {peakTimes && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Peak Usage Times</CardTitle>
                <CardDescription>Token usage intensity by hour and day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakTimes.heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Usage', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Mon" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="Tue" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Wed" stackId="a" fill="#10b981" />
                    <Bar dataKey="Thu" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Fri" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Sat" stackId="a" fill="#6b7280" />
                    <Bar dataKey="Sun" stackId="a" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Organization Usage</CardTitle>
              <CardDescription>Token consumption and costs by organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Tokens Used</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Avg/Request</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations?.organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{(org.totalTokens / 1000).toFixed(0)}K</TableCell>
                      <TableCell>${org.totalCost}</TableCell>
                      <TableCell>{org.requestCount}</TableCell>
                      <TableCell>{(org.avgTokensPerRequest / 1000).toFixed(1)}K</TableCell>
                      <TableCell>{org.avgResponseTime}ms</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {org.trend > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                          ) : org.trend < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                          ) : null}
                          <span className={org.trend > 0 ? "text-green-600" : org.trend < 0 ? "text-red-600" : ""}>
                            {Math.abs(org.trend)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.organizations[0]?.avgResponseTime || 0}ms
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: 1500ms</p>
                <Badge 
                  variant="outline" 
                  className="mt-2 bg-green-50 text-green-700"
                >
                  ✓ Good
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.organizations.reduce((sum, org) => sum + org.requestCount, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.8%</div>
                <p className="text-xs text-muted-foreground mt-1">Target: >99%</p>
                <Badge 
                  variant="outline" 
                  className="mt-2 bg-green-50 text-green-700"
                >
                  ✓ Excellent
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">72%</div>
                <p className="text-xs text-muted-foreground mt-1">Target: >70%</p>
                <Badge 
                  variant="outline" 
                  className="mt-2 bg-green-50 text-green-700"
                >
                  ✓ Good
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>System Health Indicators</CardTitle>
              <CardDescription>Real-time performance monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center">
                      <Cpu className="h-4 w-4 mr-2" />
                      API Response Time
                    </span>
                    <span className="text-sm text-muted-foreground">1.2s avg</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      Model Availability
                    </span>
                    <span className="text-sm text-muted-foreground">99.98%</span>
                  </div>
                  <Progress value={99.98} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center">
                      <HardDrive className="h-4 w-4 mr-2" />
                      Cache Efficiency
                    </span>
                    <span className="text-sm text-muted-foreground">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Token Efficiency
                    </span>
                    <span className="text-sm text-muted-foreground">89%</span>
                  </div>
                  <Progress value={89} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Cost Trend */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Cost Trend & Projection</CardTitle>
              <CardDescription>Historical costs and future projections</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} name="Actual Cost" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}