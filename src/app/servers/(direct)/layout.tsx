'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { IconBuildingStore, IconTrophy, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DirectLayout = ({ children }: IChildren) => {
  const pathname = usePathname();

  return (
    <ResizablePanelGroup orientation="horizontal" className="w-full rounded-lg">
      <ResizablePanel
        minSize={200}
        maxSize={350}
        defaultSize={300}
        className="border-r border-border bg-background/50"
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
          <Link href="/servers">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/servers' && 'bg-muted text-foreground',
              )}
            >
              <IconUsers className="h-5 w-5" />
              <TranslateText value="servers.nav.friends" />
            </Button>
          </Link>

          <Link href="/servers/store">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/servers/store' && 'bg-muted text-foreground',
              )}
            >
              <IconBuildingStore className="h-5 w-5" />
              <TranslateText value="servers.nav.store" />
            </Button>
          </Link>

          <Link href="/servers/quests">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-2 text-sm',
                pathname === '/servers/quests' && 'bg-muted text-foreground',
              )}
            >
              <IconTrophy className="h-5 w-5" />
              <TranslateText value="servers.nav.quests" />
            </Button>
          </Link>
        </div>
      </ResizablePanel>
      <ResizablePanel>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default DirectLayout;
