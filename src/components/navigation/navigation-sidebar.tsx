'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { NavigationAction } from './navigation-action';
import { NavigationItem } from './navigation-item';

function NavigationSkeleton() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-center mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      ))}
    </>
  );
}

export function NavigationSidebar() {
  const { data, isLoading } = useQuery(convexQuery(api.servers.getUserServers));

  return (
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
      <NavigationAction />
      <Separator className="h-0.5 bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {isLoading ? (
          <NavigationSkeleton />
        ) : (
          data &&
          data.length > 0 &&
          data.map(server => (
            <div key={server?._id} className="mb-4">
              <NavigationItem
                id={server?._id}
                imageUrl={server?.iconUrl || '/default-server-icon.png'}
                name={server?.name}
              />
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
