import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsLoading() {
  return (
    <div className="min-h-screen px-4 pt-8">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1.5">
          <Skeleton className="w-20 h-5 rounded" />
          <Skeleton className="w-28 h-3 rounded" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="w-20 h-8 rounded-xl" />)}
      </div>
      <div className="flex gap-2 mb-5">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="w-16 h-7 rounded-xl" />)}
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}
      </div>
    </div>
  );
}
