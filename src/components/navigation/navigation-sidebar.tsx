'use client';
import { NavigationSkeleton } from '@/components/skeletons/navigation';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/convex/_generated/api';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { cn } from '@/lib/utils';
import { convexQuery } from '@convex-dev/react-query';
import { IconBrandDiscordFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NavigationAction } from './navigation-action';
import { NavigationItem } from './navigation-item';

export function NavigationSidebar() {
  const { data, isLoading } = useQuery(convexQuery(api.servers.getUserServers));
  const { dict } = useClientDictionary();
  const params = useParams();

  return (
    <div className="flex w-[72px] flex-col h-full items-center text-primary bg-background pb-3">
      <div className="border-b border-border pb-[9px] mb-2">
        <Hint
          side="right"
          align="center"
          label={dict?.servers.directMessage.title}
          sideOffset={4}
        >
          <div className="group relative flex items-center">
            <div
              className={cn(
                'absolute left-0 bg-primary rounded-full transition-all w-1',
                params?.serverId && 'group-hover:h-5',
                !params?.serverId ? 'h-9' : 'h-2',
              )}
            />
            <Link href="/">
              <Button className="bg-(--accent-color) rounded-lg size-10 md:size-11 p-2 mx-3 hover:bg-(--accent-color)">
                <IconBrandDiscordFilled className="size-7" />
              </Button>
            </Link>
          </div>
        </Hint>
      </div>
      <ScrollArea className="w-full">
        {isLoading ? (
          <NavigationSkeleton />
        ) : (
          data &&
          data.length > 0 &&
          data.map(server => (
            <div key={server?._id} className="mb-2">
              <NavigationItem
                id={server?._id}
                imageUrl={server?.iconUrl || '/icons/icon1.png'}
                name={server?.name}
              />
            </div>
          ))
        )}
      </ScrollArea>
      <NavigationAction />
    </div>
  );
}
