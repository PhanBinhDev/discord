import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { ChannelIconTypeMapping } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { cn } from '@/lib/utils';
import { ChannelWithCategory } from '@/types';
import { IconSettings, IconUsersPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';

interface ChannelItemProps {
  channel: ChannelWithCategory;
  isActive: boolean;
}

const ChannelItem = ({ channel, isActive }: ChannelItemProps) => {
  const { dict } = useClientDictionary();
  const { openModal } = useModal();
  const { mutate: updateLastViewedChannel } = useApiMutation(
    api.servers.updateLastViewedChannel,
  );
  const [showActions, setShowActions] = useState(false);

  const Icon = ChannelIconTypeMapping[channel.type]({
    isPrivate: channel.isPrivate,
    isActive,
    hasChatFeature: ['video', 'voice'].includes(channel.type),
  });

  return (
    <Link
      href={`/servers/${channel.serverId}/channels/${channel._id}`}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 h-9 mx-1 text-sm rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
        !isActive && 'text-muted-foreground',
      )}
      onClick={event => {
        if (event.defaultPrevented) return;
        void updateLastViewedChannel({
          serverId: channel.serverId,
          channelId: channel._id,
        });
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Icon className={cn('size-4 shrink-0', isActive && 'text-foreground')} />
      <span className="flex-1 truncate">{channel.name}</span>

      {(isActive || showActions) && (
        <div className="flex gap-0.5 items-center ml-auto">
          <Hint label={dict?.servers.channel.addUsers} side="top">
            <Button
              className="size-6 group"
              size={'icon-sm'}
              variant="ghost"
              onClick={e => {
                e.preventDefault();
              }}
            >
              <IconUsersPlus className="size-4 text-muted-foreground hover:text-foreground group-hover:text-foreground" />
            </Button>
          </Hint>

          {channel.permissions.canManage && (
            <Hint label={dict?.servers.channel.channelSettings} side="top">
              <Button
                className="size-6 group"
                size={'icon-sm'}
                variant="ghost"
                onClick={e => {
                  e.preventDefault();
                  openModal('ModalEditChannel', { channel });
                }}
              >
                <IconSettings className="size-4 text-muted-foreground hover:text-foreground group-hover:text-foreground" />
              </Button>
            </Hint>
          )}
        </div>
      )}
    </Link>
  );
};

export const ChannelItemSkeleton = () => {
  return <></>;
};

export default ChannelItem;
