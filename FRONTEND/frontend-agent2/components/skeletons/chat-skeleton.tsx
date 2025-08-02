import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-xs space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>

        {/* Bot message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="max-w-xs space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-xs space-y-2">
            <Skeleton className="h-4 w-2/3 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>

        {/* Bot message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="max-w-xs space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ChatPreviewSkeleton() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ChatSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}