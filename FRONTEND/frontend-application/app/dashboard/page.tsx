"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, MessageSquare, HandHeart, Clock, ArrowRight, Home } from "lucide-react"
import { apiCall } from "@/lib/api-simple"
import Link from "next/link"

// Import the dashboard components
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { LeadsChart } from "@/components/dashboard/leads-chart"

interface DashboardData {
  totalLeads: number
  totalConversations: number
  activeLeads: number
  conversionRate: string
  leadsByDate: Array<{
    date: string
    leads: number
  }>
  activeLeadsList: Array<{
    id: string
    name: string
    lastMessage: string
    timestamp: string
  }>
  handoffsList: Array<{
    id: string
    name: string
    reason: string
    timestamp: string
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
      
      // Get organizationId from user context
      const organizationId = user?.organizationId || user?.organization?.id

      // Fetch leads, conversations, and handoffs data
      const [leadsResponse, conversationsResponse, handoffsResponse] = await Promise.all([
        apiCall("/api/leads", { headers: authHeaders }).catch(() => ({ leads: [] })),
        apiCall("/api/conversations", { headers: authHeaders }).catch(() => ({ conversations: [] })),
        apiCall("/api/conversations/handoffs", { headers: authHeaders }).catch(() => ({ conversations: [] }))
      ])

      // Handle both array and object formats
      const leadsData = Array.isArray(leadsResponse) ? leadsResponse : (leadsResponse?.leads || [])
      const conversationsData = Array.isArray(conversationsResponse) ? conversationsResponse : (conversationsResponse?.conversations || [])
      const handoffsData = Array.isArray(handoffsResponse) ? handoffsResponse : (handoffsResponse?.conversations || [])

      if (Array.isArray(leadsData) && Array.isArray(conversationsData)) {
        const totalLeads = leadsData.length
        const totalConversations = conversationsData.length
        
        // Count leads that have contact information (email or phone)
        const leadsWithContactInfo = leadsData.filter(
          (lead: any) => {
            const hasEmail = lead.email && lead.email.trim() !== '' && lead.email !== 'null' && lead.email !== 'undefined'
            const hasPhone = lead.phone && lead.phone.trim() !== '' && lead.phone !== 'null' && lead.phone !== 'undefined'
            return hasEmail || hasPhone
          }
        ).length
        
        // Calculate conversion rate: leads with contact info / total conversations
        // If no conversations, show 0%. If conversations exist, calculate the percentage
        const conversionRate = totalConversations > 0 
          ? `${Math.round((leadsWithContactInfo / totalConversations) * 100)}%` 
          : "0%"
        
        // Active leads are those without classification or with Warm/Cold classification
        const activeLeads = leadsData.filter(
          (lead: any) => !lead.classification || lead.classification === "Warm" || lead.classification === "Cold"
        ).length

        // Group leads by date for chart with qualified leads
        const leadsByDate = leadsData.reduce((acc: any, lead: any) => {
          const dateValue = lead.created_at || lead.createdAt
          if (dateValue) {
            const date = new Date(dateValue).toISOString().split("T")[0]
            if (date) {
              if (!acc[date]) {
                acc[date] = { total: 0, qualified: 0 }
              }
              acc[date].total += 1
              // Count as qualified if score >= 70
              if (lead.score && lead.score >= 70) {
                acc[date].qualified += 1
              }
            }
          }
          return acc
        }, {})

        const chartData = Object.entries(leadsByDate)
          .map(([date, counts]: [string, any]) => ({
            date,
            leads: counts.total,
            qualifiedLeads: counts.qualified,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30) // Last 30 days

        // Get active conversations (non-handoff) with lead info
        const activeConversations = conversationsData
          .filter((conv: any) => !conv.handoff && conv.status === 'active')
          .map((conv: any) => {
            const lead = leadsData.find((l: any) => l.conversation_id === conv.id)
            return {
              id: conv.id,
              name: lead?.full_name || conv.user_name || 'Unknown Lead',
              lastMessage: conv.last_message || 'No messages yet',
              timestamp: conv.last_message_at || conv.updated_at || new Date().toISOString()
            }
          })
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 4) // Get 4 for shadow effect

        // Format handoffs list
        const handoffsList = handoffsData
          .map((handoff: any) => ({
            id: handoff.id,
            name: handoff.user_name || 'Unknown User',
            reason: handoff.handoff_details?.reason || 'Human assistance requested',
            timestamp: handoff.last_message_at || handoff.updated_at || new Date().toISOString()
          }))
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 4) // Get 4 for shadow effect

        setDashboardData({
          totalLeads,
          totalConversations,
          activeLeads,
          conversionRate,
          leadsByDate: chartData,
          activeLeadsList: activeConversations,
          handoffsList: handoffsList,
        })
      } else {
        throw new Error("Invalid data format")
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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50 min-h-screen">
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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50 min-h-screen">
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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50 min-h-screen">
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center space-x-2">
            <Home className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600 ml-10">Monitor your real estate leads and agent performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top section: Leads Overview chart with integrated subscription panel */}
      <div className="w-full">
        <LeadsChart data={dashboardData.leadsByDate} />
      </div>

      {/* Main stats cards */}
      <DashboardStats
        totalConversations={dashboardData.totalConversations}
        conversionRate={dashboardData.conversionRate}
        activeLeads={dashboardData.activeLeads}
      />

      {/* Preview sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Leads Preview */}
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-lg">Active Conversations</CardTitle>
            </div>
            <Link href="/conversations">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.activeLeadsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active conversations</p>
            ) : (
              <>
                {dashboardData.activeLeadsList.slice(0, 3).map((lead, index) => (
                  <div
                    key={lead.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/conversations?conversationId=${lead.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-600 truncate mt-1">{lead.lastMessage}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(lead.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
                {dashboardData.activeLeadsList.length > 3 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10 pointer-events-none" />
                    <div className="flex items-start justify-between p-3 rounded-lg border border-gray-100 opacity-40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          +{dashboardData.activeLeadsList.length - 3} more conversations
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Handoffs Preview */}
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <HandHeart className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-lg">Handoff Queue</CardTitle>
            </div>
            <Link href="/handoff">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.handoffsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No handoff requests</p>
            ) : (
              <>
                {dashboardData.handoffsList.slice(0, 3).map((handoff, index) => (
                  <div
                    key={handoff.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-orange-100 bg-orange-50/30 hover:bg-orange-50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/handoff?conversationId=${handoff.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{handoff.name}</p>
                      <p className="text-xs text-orange-700 truncate mt-1">{handoff.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(handoff.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
                {dashboardData.handoffsList.length > 3 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10 pointer-events-none" />
                    <div className="flex items-start justify-between p-3 rounded-lg border border-orange-100 opacity-40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          +{dashboardData.handoffsList.length - 3} more handoffs
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
