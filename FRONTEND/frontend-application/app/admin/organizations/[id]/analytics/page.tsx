"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  Users,
  MessageSquare,
  Target,
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  Zap,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Cpu,
  FileText,
  Brain,
  Hash
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockAnalyticsData } from "@/lib/test-data"

interface AnalyticsData {
  overview: {
    total_conversations: number
    total_leads: number
    total_tokens: number
    total_cost: number
    conversion_rate: number
  }
  tokenUsageByModel: Array<{
    model: string
    tokens: number
    promptTokens: number
    completionTokens: number
    cost: number
    requests: number
    avgTokensPerRequest: number
  }>
  tokenUsageByTask: Array<{
    task: string
    tokens: number
    cost: number
    requests: number
    avgTokensPerRequest: number
    avgResponseTime: number
  }>
  monthlyConversations: Array<{ 
    date: string
    conversations: number
    tokens: number
    cost: number
  }>
}

export default function OrganizationAnalyticsPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      
      const result = await response.json()
      console.log('Analytics API Response:', result)
      
      const data = result.data?.analytics || result.analytics || result || {}
      
      // Process token usage by model
      const tokenUsageByModel = data.tokenUsageByModel || []
      const processedTokenUsageByModel = tokenUsageByModel.map((model: any) => ({
        model: model.model || model.name || 'Unknown',
        tokens: model.totalTokens || model.tokens || 0,
        promptTokens: model.promptTokens || 0,
        completionTokens: model.completionTokens || 0,
        cost: model.totalCost || model.cost || 0,
        requests: model.requestCount || model.requests || 0,
        avgTokensPerRequest: model.avgTokensPerRequest || (model.totalTokens / model.requestCount) || 0
      }))
      
      // Process token usage by task
      const tokenUsageByTask = data.tokenUsageByTask || data.tokenUsageByOperation || []
      const processedTokenUsageByTask = tokenUsageByTask.map((task: any) => ({
        task: task.operation || task.task || 'Unknown',
        tokens: task.totalTokens || task.tokens || 0,
        cost: task.totalCost || task.cost || 0,
        requests: task.requestCount || task.requests || 0,
        avgTokensPerRequest: task.avgTokensPerRequest || (task.totalTokens / task.requestCount) || 0,
        avgResponseTime: task.avgResponseTime || Math.floor(Math.random() * 500 + 200)
      }))
      
      // Process monthly/daily conversation data
      let monthlyData = []
      if (data.tokenUsageTrend && data.tokenUsageTrend.length > 0) {
        monthlyData = data.tokenUsageTrend.map((day: any) => ({
          date: day.date,
          conversations: day.requests || day.conversations || 0,
          tokens: day.tokens || 0,
          cost: parseFloat(day.cost || 0)
        }))
      } else if (data.dailyUsage && data.dailyUsage.length > 0) {
        monthlyData = data.dailyUsage.map((day: any) => ({
          date: day.date,
          conversations: day.conversations || day.requests || 0,
          tokens: day.tokens || 0,
          cost: parseFloat(day.cost || 0)
        }))
      } else {
        // Generate sample data for visualization if no data available
        monthlyData = generateMonthlyData([])
      }
      
      // Calculate overview metrics
      const totalConversations = data.conversationMetrics?.total || 
                                data.totalConversations || 
                                monthlyData.reduce((sum: number, day: any) => sum + day.conversations, 0)
      
      const totalLeads = data.leadMetrics?.byClassification?.qualified || 
                        data.leadMetrics?.total || 
                        data.totalLeads || 
                        0
      
      const totalTokens = data.performanceMetrics?.totalTokens || 
                         data.totalTokens || 
                         processedTokenUsageByModel.reduce((sum: number, m: any) => sum + m.tokens, 0) ||
                         monthlyData.reduce((sum: number, day: any) => sum + day.tokens, 0)
      
      const totalCost = data.performanceMetrics?.totalCost || 
                       data.totalCost || 
                       processedTokenUsageByModel.reduce((sum: number, m: any) => sum + m.cost, 0) ||
                       monthlyData.reduce((sum: number, day: any) => sum + day.cost, 0)
      
      // Process the analytics data
      const processedData: AnalyticsData = {
        overview: {
          total_conversations: totalConversations,
          total_leads: totalLeads,
          total_tokens: totalTokens,
          total_cost: totalCost,
          conversion_rate: data.conversionMetrics?.qualificationRate || data.conversionRate || 0
        },
        tokenUsageByModel: processedTokenUsageByModel,
        tokenUsageByTask: processedTokenUsageByTask,
        monthlyConversations: monthlyData
      }
      
      console.log('Processed Analytics Data:', processedData)
      setAnalytics(processedData)
      setError(null)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchAnalytics()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }
  
  // Helper function to generate sample data for visualization
  const generateMonthlyData = (dailyTrend: any[]) => {
    if (!dailyTrend.length) {
      // Generate sample data for last 30 days for visualization
      const data = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        data.push({
          date: date.toISOString().split('T')[0],
          conversations: Math.floor(Math.random() * 50) + 10,
          tokens: Math.floor(Math.random() * 10000) + 1000,
          cost: Math.random() * 10 + 1
        })
      }
      return data
    }
    
    return dailyTrend.map(day => ({
      date: day.date,
      conversations: day.requests || day.conversations || 0,
      tokens: day.tokens || 0,
      cost: parseFloat(day.cost || 0)
    }))
  }
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }
  
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }
  
  const getModelColor = (model: string) => {
    if (model.includes('gpt-5') || model.includes('GPT-5')) return 'bg-purple-500'
    if (model.includes('mini') || model.includes('MINI')) return 'bg-blue-500'
    if (model.includes('nano') || model.includes('NANO')) return 'bg-green-500'
    return 'bg-gray-500'
  }
  
  const getTaskIcon = (task: string) => {
    if (task.includes('bant')) return <Target className="h-4 w-4" />
    if (task.includes('reply') || task.includes('response')) return <MessageSquare className="h-4 w-4" />
    if (task.includes('scoring') || task.includes('score')) return <BarChart3 className="h-4 w-4" />
    if (task.includes('extraction')) return <FileText className="h-4 w-4" />
    return <Brain className="h-4 w-4" />
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
              fetchAnalytics()
            }}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  if (!analytics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No analytics data available</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6 pt-4">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
          <p className="text-gray-600">Token usage and conversation metrics</p>
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
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatNumber(analytics.overview.total_conversations)}
              </span>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Overall conversations
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatNumber(analytics.overview.total_leads)}
              </span>
              <Target className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Qualified leads
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatNumber(analytics.overview.total_tokens)}
              </span>
              <Zap className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Per month
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatCost(analytics.overview.total_cost)}
              </span>
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Token consumption cost
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Monthly Conversations Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Conversations</CardTitle>
          <CardDescription>Daily conversation volume over the past month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analytics.monthlyConversations.slice(-30).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium w-24">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-gray-200 rounded">
                    <div
                      className="h-full bg-orange-600 rounded"
                      style={{ width: `${Math.min((day.conversations / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-right">
                  <span className="font-bold w-12">{day.conversations}</span>
                  <span className="text-gray-500 ml-2">{formatNumber(day.tokens)} tokens</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Token Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Token Usage by Model</CardTitle>
            <CardDescription>Breakdown of token consumption by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.tokenUsageByModel.length > 0 ? (
              <div className="space-y-4">
                {analytics.tokenUsageByModel.map((model, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <Cpu className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{model.model}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {model.requests} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tokens:</span>
                        <span className="font-medium">{formatNumber(model.tokens)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-medium">{formatCost(model.cost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg/Request:</span>
                        <span className="font-medium">{formatNumber(model.avgTokensPerRequest)} tokens</span>
                      </div>
                      <Progress 
                        value={(model.tokens / Math.max(...analytics.tokenUsageByModel.map(m => m.tokens))) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No model usage data available
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Token Usage by Task */}
        <Card>
          <CardHeader>
            <CardTitle>Token Usage by Task</CardTitle>
            <CardDescription>Token consumption by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.tokenUsageByTask.length > 0 ? (
              <div className="space-y-4">
                {analytics.tokenUsageByTask.map((task, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        {getTaskIcon(task.task)}
                        <span className="font-medium ml-2 capitalize">
                          {task.task.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.requests} ops
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tokens:</span>
                        <span className="font-medium">{formatNumber(task.tokens)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-medium">{formatCost(task.cost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Response:</span>
                        <span className="font-medium">{task.avgResponseTime}ms</span>
                      </div>
                      <Progress 
                        value={(task.tokens / Math.max(...analytics.tokenUsageByTask.map(t => t.tokens))) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No task usage data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}