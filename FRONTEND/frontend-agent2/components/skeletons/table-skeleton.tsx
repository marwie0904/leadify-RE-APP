import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showActions?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  showActions = true 
}: TableSkeletonProps) {
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {/* Table Header */}
          <div className="flex gap-4 pb-3 border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
            {showActions && <Skeleton className="h-4 w-20" />}
          </div>
          
          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 py-2">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1">
                  {colIndex === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-full" />
                  )}
                </div>
              ))}
              {showActions && (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentTableSkeleton() {
  return (
    <TableSkeleton
      rows={6}
      columns={5}
      showHeader={true}
      showActions={true}
    />
  );
}

export function LeadsTableSkeleton() {
  return (
    <TableSkeleton
      rows={8}
      columns={6}
      showHeader={true}
      showActions={true}
    />
  );
}

export function MembersTableSkeleton() {
  return (
    <TableSkeleton
      rows={4}
      columns={4}
      showHeader={true}
      showActions={true}
    />
  );
}