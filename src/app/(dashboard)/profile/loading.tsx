import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen px-4 pt-8">
      <Skeleton className="w-20 h-6 rounded mb-6" />
      <Skeleton className="h-40 rounded-3xl mb-6" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
