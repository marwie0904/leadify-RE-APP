"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, TrendingUp, TrendingDown, DollarSign, Brain, Activity, Download, BarChart3 } from "lucide-react"
import { 
  aiAnalyticsAPI,
  type TokenSummary,
  type ConversationAnalytics,
  type OperationAnalytics,
  type OrganizationAnalytics 
} from '@/lib/api/ai-analytics'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = {
  'gpt-4': '#8b5cf6',
  'gpt-3.5-turbo': '#3b82f6',
  'chat_reply': '#8b5cf6',
  'bant_extraction': '#3b82f6',
  'lead_scoring': '#10b981',
  'intent_classification': '#f59e0b',
  'estimation': '#ef4444'
}

export default function StandaloneAIAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [summary, setSummary] = useState<TokenSummary | null>(null)
  const [conversations, setConversations] = useState<ConversationAnalytics | null>(null)
  const [operations, setOperations] = useState<OperationAnalytics | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationAnalytics | null>(null)

  const fetchData = async () => {
    try {
      setError(null)
      
      const [summaryData, conversationsData, operationsData, organizationsData] = await Promise.all([
        aiAnalyticsAPI.getSummary(),
        aiAnalyticsAPI.getConversationAnalytics(),
        aiAnalyticsAPI.getOperationAnalytics(),
        aiAnalyticsAPI.getOrganizationAnalytics(1, 20)
      ])

      setSummary(summaryData)
      setConversations(conversationsData)
      setOperations(operationsData)
      setOrganizations(organizationsData)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      if (err.response?.status === 403) {
        setError('You need admin access to view this page. Please contact your administrator.')
      } else if (err.response?.status === 401) {
        setError('Please sign in to view analytics.')
        window.location.href = '/auth'
      } else {
        setError('Failed to load analytics data.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const handleExport = () => {
    const data = { summary, conversations, operations, organizations }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-analytics-${new Date().toISOString()}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.href = '/auth'} className="mt-4">
          Sign In
        </Button>
      </div>
    )
  }

  const modelData = conversations?.modelDistribution ? 
    Object.entries(conversations.modelDistribution).map(([model, data]) => ({
      name: model,
      value: data.totalTokens,
      percentage: data.percentage
    })) : []

  const operationData = operations?.operationBreakdown ?
    Object.entries(operations.operationBreakdown).map(([op, data]) => ({
      name: op.replace('_', ' ').toUpperCase(),
      tokens: data.tokens,
      cost: data.cost,
      requests: data.requests
    })) : []

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor your AI usage and costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalTokens.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {summary?.averageTokensPerOrg.toLocaleString() || 0} per org
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <DollarSign className="h-5 w-5" />
              {summary?.totalCost.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg ${summary?.averageCostPerOrg.toFixed(2) || '0.00'} per org
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.uniqueOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Month Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {summary?.monthOverMonth.percentageChange ? (
                summary.monthOverMonth.percentageChange > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500 mr-1" />
                    +{summary.monthOverMonth.percentageChange}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500 mr-1" />
                    {summary.monthOverMonth.percentageChange}%
                  </>
                )
              ) : (
                <span>0%</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Model Distribution</CardTitle>
            <CardDescription>Token usage by model type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Operation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Breakdown</CardTitle>
            <CardDescription>Usage by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={operationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      {organizations && organizations.organizations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Organization Analytics</CardTitle>
            <CardDescription>Token usage and costs by organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Organization</th>
                    <th className="text-right p-2">Tokens</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Requests</th>
                    <th className="text-right p-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.organizations.map((org) => (
                    <tr key={org.id} className="border-b">
                      <td className="p-2">{org.name}</td>
                      <td className="text-right p-2">{org.totalTokens.toLocaleString()}</td>
                      <td className="text-right p-2">${org.totalCost.toFixed(2)}</td>
                      <td className="text-right p-2">{org.requestCount}</td>
                      <td className="text-right p-2">
                        {org.trend > 0 ? (
                          <span className="text-green-500">+{org.trend}%</span>
                        ) : org.trend < 0 ? (
                          <span className="text-red-500">{org.trend}%</span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}