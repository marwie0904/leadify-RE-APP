"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { apiCall, batchApiCalls } from "@/lib/api"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import dynamic from 'next/dynamic'

const LeadsChart = dynamic(() => import('@/components/dashboard/leads-chart').then(mod => mod.LeadsChart), {
  loading: () => (
    <Card className="col-span-4">
      <CardHeader>
        <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted animate-pulse rounded"></div>
      </CardContent>
    </Card>
  ),
  ssr: false
})
import { SubscriptionPanel } from "@/components/dashboard/subscription-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DashboardData {
  totalLeads: number
  convertedLeads: number
  conversionRate: string
  leadsByDate: Array<{
    date: string
    leads: number
  }>
}

export default function DashboardPage() {
  const { user, getAuthHeaders } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const authHeaders = await getAuthHeaders()

      // **OPTIMIZED BATCH API APPROACH**
      // Load multiple dashboard endpoints in parallel
      const batchResults = await batchApiCalls([
        { 
          endpoint: "/api/dashboard/summary", 
          options: { headers: authHeaders, cache: true } 
        },
        { 
          endpoint: "/api/leads", 
          options: { headers: authHeaders, cache: true } 
        },
        { 
          endpoint: "/api/agents", 
          options: { headers: authHeaders, cache: true } 
        },
        { 
          endpoint: "/api/conversations", 
          options: { headers: authHeaders, cache: true } 
        }
      ])

      const [summaryResult, leadsResult, agentsResult, conversationsResult] = batchResults

      // Try to use summary data first (if available)
      if (summaryResult && !summaryResult.error) {
        const summaryData = summaryResult
        setDashboardData({
          totalLeads: summaryData.totalLeads || 0,
          convertedLeads: summaryData.convertedLeads || 0,
          conversionRate: summaryData.conversionRate || "0%",
          leadsByDate: summaryData.leadsByDate || [],
        })
        return
      }

      // Fallback to calculating from leads data (enhanced with batch data)
      if (leadsResult && !leadsResult.error && Array.isArray(leadsResult)) {
        const leadsData = leadsResult
        
        const totalLeads = leadsData.length
        const convertedLeads = leadsData.filter(
          (lead: any) => lead.classification === "Hot" || lead.classification === "Priority",
        ).length
        const conversionRate = totalLeads > 0 ? `${Math.round((convertedLeads / totalLeads) * 100)}%` : "0%"

        // Group leads by date for chart
        const leadsByDate = leadsData.reduce((acc: any, lead: any) => {
          const date = new Date(lead.created_at || lead.createdAt).toISOString().split("T")[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        }, {})

        const chartData = Object.entries(leadsByDate)
          .map(([date, count]) => ({
            date,
            leads: count as number,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        setDashboardData({
          totalLeads,
          convertedLeads,
          conversionRate,
          leadsByDate: chartData,
        })
        
        // Log batch loading success
        console.log("[Dashboard] Batch API loaded successfully:", {
          leads: !leadsResult?.error,
          agents: !agentsResult?.error,
          conversations: !conversationsResult?.error,
          cacheEnabled: true
        })
      } else {
        throw new Error("Failed to load dashboard data from all endpoints")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Unable to load dashboard data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <DashboardStats
        totalLeads={dashboardData.totalLeads}
        convertedLeads={dashboardData.convertedLeads}
        conversionRate={dashboardData.conversionRate}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <LeadsChart data={dashboardData.leadsByDate} />
        <SubscriptionPanel />
      </div>
    </div>
  )
}
