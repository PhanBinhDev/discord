import { Doc, Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { ChannelWithCategory } from '@/types';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import ChannelItem from './channel-item';

interface CategoryItemProps {
  category: Doc<'channelCategories'>;
  channels: ChannelWithCategory[];
  position: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

const CategoryItem = ({
  category,
  channels,
  position,
  isCollapsed,
  onToggle,
}: CategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category._id,
    data: {
      type: 'category',
      position,
    },
  });

  const params = useParams();
  const channelId = params?.channelId as Id<'channels'> | undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex-1', isDragging && 'opacity-50')}
    >
      {/* Category header */}
      <button
        className="cursor-pointer flex items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground w-fit group"
        onClick={onToggle}
        {...attributes}
        {...listeners}
      >
        <span className="flex-1 text-left">{category.name}</span>
        <ChevronRight
          className={cn(
            'size-3 transition-transform',
            isCollapsed ? 'rotate-0' : 'rotate-90',
          )}
        />
      </button>

      {/* Channels in category */}
      {!isCollapsed ? (
        <SortableContext
          items={channels.map(ch => ch._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {channels.map((channel, idx) => (
              <ChannelItem
                key={channel._id}
                channel={channel}
                position={idx}
                categoryId={category._id}
                isActive={channelId === channel._id}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <>
          {(() => {
            const activeChannel = channels.find(ch => ch._id === channelId);
            if (!activeChannel) return null;
            return (
              <ChannelItem
                key={activeChannel._id}
                channel={activeChannel}
                position={channels.findIndex(
                  ch => ch._id === activeChannel._id,
                )}
                categoryId={category._id}
                isActive={true}
              />
            );
          })()}
        </>
      )}
    </div>
  );
};

export default CategoryItem;
