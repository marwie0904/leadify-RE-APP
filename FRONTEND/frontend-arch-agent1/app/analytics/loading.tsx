import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AnalyticsLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="h-9 bg-muted animate-pulse rounded w-32"></div>
      </div>

      {/* Overview Cards Skeleton */}
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

      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-32 mb-2"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-40 mb-2"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-56"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Content Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-muted animate-pulse rounded w-28 mb-2"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-36"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
