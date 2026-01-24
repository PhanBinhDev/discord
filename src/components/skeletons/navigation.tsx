import { Skeleton } from '@/components/ui/skeleton';

export function NavigationSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-center mb-2">
          <Skeleton className="size-10 md:size-11 rounded-lg" />
        </div>
      ))}
    </>
  );
}
