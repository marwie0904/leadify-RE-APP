import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, TrendingUp, Activity } from "lucide-react"

interface DashboardStatsProps {
  totalConversations: number
  conversionRate: string
  activeLeads: number
}

export function DashboardStats({ totalConversations, conversionRate, activeLeads }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Total Conversations</CardTitle>
          <MessageSquare className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalConversations}</div>
          <p className="text-xs text-gray-600">All chat conversations</p>
        </CardContent>
      </Card>

      <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{conversionRate}</div>
          <p className="text-xs text-gray-600">Leads with contact / conversations</p>
        </CardContent>
      </Card>

      <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Active Leads</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{activeLeads}</div>
          <p className="text-xs text-gray-600">Warm & Cold leads</p>
        </CardContent>
      </Card>
    </div>
  )
}
