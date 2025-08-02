import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, TrendingUp, Activity } from "lucide-react"

interface DashboardStatsProps {
  totalLeads: number
  convertedLeads: number
  conversionRate: string
}

export function DashboardStats({ totalLeads, convertedLeads, conversionRate }: DashboardStatsProps) {
  const activeLeads = totalLeads - convertedLeads

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLeads}</div>
          <p className="text-xs text-muted-foreground">All leads in system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Converted Leads</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{convertedLeads}</div>
          <p className="text-xs text-muted-foreground">Hot & Priority leads</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversionRate}</div>
          <p className="text-xs text-muted-foreground">Of total leads</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeLeads}</div>
          <p className="text-xs text-muted-foreground">Pending conversion</p>
        </CardContent>
      </Card>
    </div>
  )
}
