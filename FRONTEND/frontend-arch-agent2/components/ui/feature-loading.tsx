import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface FeatureLoadingProps {
  title?: string
  description?: string
  showCards?: number
}

export function FeatureLoading({ 
  title = "Loading...", 
  description = "Please wait while we load this feature",
  showCards = 3 
}: FeatureLoadingProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: showCards }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}