import { ChannelIconTypeMapping } from '@/constants/app';
import { cn } from '@/lib/utils';
import { ChannelWithCategory } from '@/types';
import Link from 'next/link';

interface ChannelItemProps {
  channel: ChannelWithCategory;
  isActive: boolean;
}

const ChannelItem = ({ channel, isActive }: ChannelItemProps) => {
  const Icon = ChannelIconTypeMapping[channel.type]({
    isPrivate: channel.isPrivate,
    isActive,
    hasChatFeature: ['video', 'voice'].includes(channel.type),
  });

  return (
    <Link
      href={`/servers/${channel.serverId}/channels/${channel._id}`}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 mx-1 text-sm rounded-md transition-colors group',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium',
        !isActive && 'text-muted-foreground',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isActive && 'text-foreground')} />
      <span className="flex-1 truncate">{channel.name}</span>

      {/* Optional: Add indicators */}
      {channel.isPrivate && (
        <div className="size-1 rounded-full bg-yellow-500 shrink-0" />
      )}
    </Link>
  );
};

export default ChannelItem;
