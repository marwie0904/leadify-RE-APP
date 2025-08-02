import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConversationsLoading() {
  return (
    <div className="flex h-screen">
      {/* Conversations List Skeleton */}
      <div className="w-80 border-r bg-background">
        <div className="p-4">
          <Skeleton className="h-10 w-full mb-4" />
        </div>
        <div className="space-y-2 p-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Interface Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
