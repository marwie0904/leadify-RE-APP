"use client"

import { Suspense, lazy } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load heavy analytics components
const OverviewTab = lazy(() => import("@/components/analytics/overview-tab").then(mod => ({ default: mod.OverviewTab })))
const AnalyticsTab = lazy(() => import("@/components/analytics/analytics-tab").then(mod => ({ default: mod.AnalyticsTab })))
const ReportsTab = lazy(() => import("@/components/analytics/reports-tab").then(mod => ({ default: mod.ReportsTab })))
const NotificationsTab = lazy(() => import("@/components/analytics/notifications-tab").then(mod => ({ default: mod.NotificationsTab })))

// Tab loading component
function TabLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function AnalyticsPage() {
  const handleExportData = () => {
    // Implement export functionality here
    console.log("Exporting data...")
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center space-x-2">
          <DateRangePicker />
          <Button onClick={handleExportData} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<TabLoading />}>
            <OverviewTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Suspense fallback={<TabLoading />}>
            <AnalyticsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Suspense fallback={<TabLoading />}>
            <ReportsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Suspense fallback={<TabLoading />}>
            <NotificationsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
