import { ChannelIconTypeMapping } from '@/constants/app';
import { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { ChannelWithCategory } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

interface ChannelItemProps {
  channel: ChannelWithCategory;
  position: number;
  categoryId: Id<'channelCategories'> | null;
  isActive: boolean;
}

const ChannelItem = ({
  channel,
  position,
  categoryId,
  isActive,
}: ChannelItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: channel._id,
    data: {
      type: 'channel',
      position,
      categoryId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = ChannelIconTypeMapping[channel.type]({
    isPrivate: channel.isPrivate,
    isActive,
    hasChatFeature: ['video', 'voice'].includes(channel.type),
  });

  return (
    <Link
      href={`/servers/${channel.serverId}/channels/${channel._id}`}
      passHref
    >
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'w-full flex items-center gap-2 p-2 text-sm rounded-lg hover:bg-accent cursor-pointer group',
          isActive && 'bg-accent/70',
          isDragging && 'opacity-50',
        )}
        {...attributes}
        {...listeners}
      >
        <Icon className="size-4 text-muted-foreground" />
        <span className="flex-1">{channel.name}</span>

        <></>
      </div>
    </Link>
  );
};

export default ChannelItem;
