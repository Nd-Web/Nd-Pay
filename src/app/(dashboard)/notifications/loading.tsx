import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen px-4 pt-14">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Skeleton className="w-36 h-6 rounded" />
          <Skeleton className="w-20 h-3 rounded" />
        </div>
        <Skeleton className="w-28 h-8 rounded-xl" />
      </div>
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
      </div>
    </div>
  );
}
