import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { cn } from '@/lib/utils';
import { ChannelWithCategory } from '@/types';
import { IconPlus } from '@tabler/icons-react';
import { ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import ChannelItem from './channel-item';

interface CategoryItemProps {
  category: Doc<'channelCategories'>;
  channels: ChannelWithCategory[];
  isCollapsed: boolean;
  onToggle: () => void;
  canManageChannels?: boolean;
}

const CategoryItem = ({
  category,
  channels,
  isCollapsed,
  onToggle,
  canManageChannels = false,
}: CategoryItemProps) => {
  const { openModal } = useModal();
  const { dict } = useClientDictionary();

  const params = useParams();
  const channelId = params?.channelId as Id<'channels'> | undefined;

  const isEmpty = channels.length === 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between w-full">
        <button
          className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground w-fit transition-colors"
          onClick={onToggle}
        >
          <span className="flex-1 text-left tracking-wide">
            {category.name}
          </span>
          <ChevronRight
            className={cn(
              'size-3 transition-transform shrink-0',
              isCollapsed ? 'rotate-0' : 'rotate-90',
            )}
          />
        </button>

        {canManageChannels && (
          <div className="flex items-center gap-0.5">
            <Hint label={dict?.servers.channel.create} side="top">
              <Button
                size={'icon'}
                variant="ghost"
                className="size-6"
                onClick={() => {
                  openModal('ModalCreateChannel', {
                    category,
                  });
                }}
              >
                <IconPlus className="size-3" />
              </Button>
            </Hint>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {isEmpty ? (
            <div className="px-2 py-2 text-xs text-muted-foreground/50 italic">
              <TranslateText value="servers.noChannels" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {channels.map(channel => (
                <ChannelItem
                  key={channel._id}
                  channel={channel}
                  isActive={channelId === channel._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isCollapsed &&
        (() => {
          const activeChannel = channels.find(ch => ch._id === channelId);
          if (!activeChannel) return null;
          return (
            <ChannelItem
              key={activeChannel._id}
              channel={activeChannel}
              isActive={true}
            />
          );
        })()}
    </div>
  );
};

export default CategoryItem;
