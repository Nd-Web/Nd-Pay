import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen px-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-20 h-2.5 rounded" />
            <Skeleton className="w-32 h-4 rounded" />
          </div>
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>

      {/* Balance card */}
      <Skeleton className="h-44 rounded-3xl mb-6" />

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <Skeleton className="w-10 h-2.5 rounded" />
          </div>
        ))}
      </div>

      {/* Contacts row */}
      <div className="mb-8">
        <Skeleton className="w-24 h-3 rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton className="w-12 h-2.5 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <Skeleton className="w-28 h-3 rounded mb-4" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
