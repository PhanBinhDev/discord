'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_PANNEL_LEFT_MIN_WIDTH } from '@/constants/app';
import { api } from '@/convex/_generated/api';
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
import { usePathname } from 'next/navigation';
import Conversations from './_components/conversations';

const DirectLayout = ({ children }: IChildren) => {
  const pathname = usePathname();
  const { dict } = useClientDictionary();
  const { openModal } = useModal();
  const { setWidth } = useSidebarWidth();
  const { data: hasFriends, isLoading: isCheckingFriends } = useQuery(
    convexQuery(api.friends.hasFriends),
  );

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
          <Button
            variant="ghost"
            className="w-full pr-2 pl-3 text-sm justify-center bg-muted/80 hover:bg-muted truncate"
          >
            <span className="truncate">
              <TranslateText value="servers.nav.findOrStart" />
            </span>
          </Button>
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
        <Conversations />
      </ResizablePanel>
      <ResizablePanel>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default DirectLayout;
