'use client';

import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { api } from '@/convex/_generated/api';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useSidebarWidth } from '@/hooks/use-sidebar-width';
import { convexQuery } from '@convex-dev/react-query';
import { IconSettings } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import Headset from './headset';
import Microphone from './microphone';
import UserCardPopover from './popover';

const UserCard = () => {
  const { width } = useSidebarWidth();
  const { dict } = useClientDictionary();
  const [isHovered, setIsHovered] = useState(false);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery(
    convexQuery(api.users.currentUser),
  );

  const statusLabel = useMemo(() => {
    if (!currentUser || isLoadingCurrentUser) return 'Ngoại tuyến';

    return currentUser.status === 'busy'
      ? 'Bận'
      : currentUser.status === 'away'
        ? 'Vắng mặt'
        : currentUser.status === 'offline'
          ? 'Ngoại tuyến'
          : 'Trực tuyến';
  }, [currentUser, isLoadingCurrentUser]);

  if (isLoadingCurrentUser || !currentUser) {
    return (
      <div
        className="p-2 bg-muted absolute bottom-2 left-2 rounded-lg flex items-center gap-2"
        style={{ width: `calc(72px + ${width}px - 15px)` }}
      >
        <div className="py-1 px-2 flex items-center gap-2 flex-1 min-w-0">
          {/* Avatar skeleton */}
          <div className="size-8 rounded-full bg-muted-foreground/20 animate-pulse" />

          {/* User info skeleton */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="h-3.5 w-24 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-2 pr-2.5 bg-muted absolute bottom-2 left-2 rounded-lg flex items-center gap-2"
      style={{ width: `calc(72px + ${width}px - 15px)` }}
    >
      {/* Avatar */}
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="py-1 pr-2 pl-1 flex items-center gap-2 rounded-sm hover:bg-muted-foreground/10 cursor-pointer flex-1 min-w-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <UserAvatar
              src={currentUser.avatarUrl}
              name={currentUser.displayName}
              showTooltip={false}
              border={false}
              status={{
                size: 5,
                status: currentUser.status!,
                position: '-bottom-1 -right-1',
              }}
            />

            <div className="flex-1 min-w-0 flex flex-col">
              {/* Display name - fixed */}
              <div className="text-sm font-semibold text-foreground truncate">
                {currentUser.displayName || currentUser.username}
              </div>

              {/* Username/Status - sliding */}
              <div className="overflow-hidden relative h-4">
                <div
                  className="absolute inset-0 transition-transform duration-200 ease-in-out"
                  style={{
                    transform: isHovered
                      ? 'translateY(-100%)'
                      : 'translateY(0)',
                  }}
                >
                  {/* Default state - status */}
                  <div className="text-xs text-muted-foreground truncate h-4">
                    {statusLabel}
                  </div>

                  {/* Hover state - username and discriminator */}
                  <div className="text-xs text-muted-foreground truncate h-4">
                    {currentUser.username}#{currentUser.discriminator}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={12}
          side="top"
          className="w-[300px] p-0"
        >
          <UserCardPopover user={currentUser} />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1">
        <Microphone />
        <Headset />
        <Hint
          label={dict?.servers.settings.title}
          side="top"
          align="center"
          alignOffset={0}
        >
          <Button
            size={'icon'}
            variant={'ghost'}
            className="group hover:bg-muted-foreground/10"
          >
            <IconSettings className="size-5 transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </Hint>
      </div>
    </div>
  );
};

export default UserCard;
