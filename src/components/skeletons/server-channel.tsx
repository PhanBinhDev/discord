import { Skeleton } from '@/components/ui/skeleton';

const ServerChannelSkeleton = () => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 mx-1 text-sm rounded-md transition-colors group bg-accent/40">
      <Skeleton className="size-4 shrink-0 rounded flex items-center justify-center" />
      <Skeleton className="h-4 flex-1 max-w-24 rounded" />
    </div>
  );
};

export default ServerChannelSkeleton;
