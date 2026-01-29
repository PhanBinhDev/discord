import { Skeleton } from '@/components/ui/skeleton';

const ServerCategorySkeleton = ({ lines = 5 }: { lines?: number }) => {
  return (
    <div className="flex flex-col w-full gap-1.5">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-2 py-1 text-sm group w-[90%]"
        >
          <Skeleton className="size-8 rounded-full shrink-0 flex items-center justify-center" />
          <Skeleton className="h-6 flex-1 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export default ServerCategorySkeleton;
