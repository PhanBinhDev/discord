'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_PANNEL_LEFT_MIN_WIDTH } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { useSidebarWidth } from '@/hooks/use-sidebar-width';
import { cn } from '@/lib/utils';
import { convexQuery } from '@convex-dev/react-query';
import {
  IconBuildingStore,
  IconPlus,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import ServerDropdown from './_components/server-dropdown';

interface ServerLayoutProps extends IChildren {
  params: Promise<{
    serverId: Id<'servers'>;
  }>;
}

const ServerLayout = ({ children, params }: ServerLayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useClientDictionary();
  const { openModal } = useModal();
  const { setWidth } = useSidebarWidth();
  const { data: hasFriends, isLoading: isCheckingFriends } = useQuery(
    convexQuery(api.friends.hasFriends),
  );

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
        <div className="p-2 border-border border-b">
          <ServerDropdown server={server} />
        </div>
        <div className="flex flex-col gap-1 p-2">
          <Link href="/">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/' && 'bg-muted text-foreground',
              )}
            >
              <IconUsers className="h-5 w-5" />
              <TranslateText value="servers.nav.friends" />
            </Button>
          </Link>

          <Link href="/store">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/store' && 'bg-muted text-foreground',
              )}
            >
              <IconBuildingStore className="h-5 w-5" />
              <TranslateText value="servers.nav.store" />
            </Button>
          </Link>

          <Link href="/quests">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/quests' && 'bg-muted text-foreground',
              )}
            >
              <IconTrophy className="h-5 w-5" />
              <TranslateText value="servers.nav.quests" />
            </Button>
          </Link>
        </div>
        <Separator className="w-[94%]! mx-auto" />
        <div className="flex items-center justify-between px-3 pt-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wide">
            <TranslateText value="servers.directMessage.title" />
          </h3>

          <Hint
            label={dict?.servers.directMessage.create}
            side="top"
            align="center"
          >
            <Button
              size="icon-sm"
              variant="ghost"
              className="p-1 hover:text-foreground text-muted-foreground transition-colors"
              onClick={() =>
                openModal('ModalCreateDirectMessage', {
                  hasFriends: !!hasFriends,
                })
              }
              disabled={isCheckingFriends}
            >
              <IconPlus className="size-4" />
            </Button>
          </Hint>
        </div>
      </ResizablePanel>
      <ResizablePanel>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ServerLayout;
