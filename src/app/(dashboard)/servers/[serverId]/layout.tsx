'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import ServerCategorySkeleton from '@/components/skeletons/server-category';
import { Button } from '@/components/ui/button';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_PANNEL_LEFT_MIN_WIDTH } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import useModal from '@/hooks/use-modal';
import { useSidebarWidth } from '@/hooks/use-sidebar-width';
import { convexQuery } from '@convex-dev/react-query';
import {
  IconCalendarEvent,
  IconRocket,
  IconUsersPlus,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import ServerChannels from './_components/server-channels';
import ServerDropdown from './_components/server-dropdown';

interface ServerLayoutProps extends IChildren {
  params: Promise<{
    serverId: Id<'servers'>;
  }>;
}

const ServerLayout = ({ children, params }: ServerLayoutProps) => {
  const router = useRouter();
  const { openModal } = useModal();
  const { setWidth } = useSidebarWidth();

  const { serverId } = use(params);

  const { data: server, isLoading: isLoadingServer } = useQuery(
    convexQuery(api.servers.getServerById, {
      serverId,
    }),
  );

  useEffect(() => {
    if (!isLoadingServer && !server) {
      router.push('/');
    }
  }, [server, isLoadingServer, router]);

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="w-full rounded-l-lg border-none"
    >
      <ResizablePanel
        minSize={200}
        maxSize={350}
        defaultSize={DEFAULT_PANNEL_LEFT_MIN_WIDTH}
        className="bg-background/50"
        onResize={size => setWidth(size.inPixels)}
      >
        <div className="p-2 border-border border-b flex items-center justify-between">
          <ServerDropdown server={server} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              openModal('ModalInvitePeople', {
                server,
              })
            }
          >
            <IconUsersPlus className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col gap-1 p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-2 text-sm"
          >
            <IconCalendarEvent className="h-5 w-5" />
            <TranslateText value="servers.nav.event" />
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-2 text-sm"
          >
            <IconRocket className="h-5 w-5" />
            <TranslateText value="servers.nav.boots" />
          </Button>
        </div>
        <Separator className="w-[94%]! mx-auto" />
        <div className="flex items-center justify-between px-3 pt-1.5">
          {isLoadingServer ? (
            <ServerCategorySkeleton />
          ) : (
            <ServerChannels server={server} />
          )}
        </div>
      </ResizablePanel>
      <ResizablePanel>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ServerLayout;
