'use client';

import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { api } from '@/convex/_generated/api';
import { Id, TableNames } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { ApiReturn, ChannelWithCategory, RenderItem } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { memo, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from 'usehooks-ts';
import CategoryItem from './category-item';
import ChannelItem from './channel-item';

interface ServerChannelsProps {
  server: ApiReturn<typeof api.servers.getServerById> | null | undefined;
}

const ServerChannels = memo(({ server }: ServerChannelsProps) => {
  const [activeId, setActiveId] = useState<Id<TableNames> | null>(null);
  const [collapsedCategoriesArray, setCollapsedCategoriesArray] =
    useLocalStorage<string[]>(
      LOCAL_STORAGE_KEY.SERVER_CHANNELS_COLLAPSED_CATEGORIES,
      [],
    );

  const params = useParams();
  const channelId = params?.channelId as Id<'channels'> | undefined;

  const { mutate: moveChannel } = useApiMutation(api.servers.moveChannel);
  const { mutate: moveCategory } = useApiMutation(api.servers.moveCategory);

  const { data: channels } = useQuery(
    convexQuery(api.servers.getAccessibleChannels, {
      serverId: server?._id as Id<'servers'>,
    }),
  );

  const { data: categories } = useQuery(
    convexQuery(api.servers.getServerCategories, {
      serverId: server?._id as Id<'servers'>,
    }),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const sortedItems = useMemo((): RenderItem[] => {
    if (!categories || !channels) return [];

    const items: RenderItem[] = [];

    // Group channels by category
    const channelsByCategory = new Map<string, ChannelWithCategory[]>();
    const uncategorizedChannels: ChannelWithCategory[] = [];

    channels.channels.forEach(channel => {
      if (channel.category) {
        const categoryId = channel.category._id;
        if (!channelsByCategory.has(categoryId)) {
          channelsByCategory.set(categoryId, []);
        }
        channelsByCategory.get(categoryId)!.push(channel);
      } else {
        uncategorizedChannels.push(channel);
      }
    });

    // Sort channels within each category
    channelsByCategory.forEach(chans => {
      chans.sort((a, b) => a.position - b.position);
    });

    uncategorizedChannels.sort((a, b) => a.position - b.position);

    // ✅ Merge categories and uncategorized channels by position
    // IMPORTANT: All categories are always shown, even if empty
    let categoryIndex = 0;
    let channelIndex = 0;

    while (
      categoryIndex < categories.length ||
      channelIndex < uncategorizedChannels.length
    ) {
      const currentCategory = categories[categoryIndex];
      const currentChannel = uncategorizedChannels[channelIndex];

      const categoryPos = currentCategory?.position ?? Infinity;
      const channelPos = currentChannel?.position ?? Infinity;

      if (categoryPos < channelPos) {
        items.push({
          type: 'category',
          category: currentCategory,
          channels: channelsByCategory.get(currentCategory._id) || [],
          position: currentCategory.position,
        });
        categoryIndex++;
      } else if (currentChannel) {
        items.push({
          type: 'channel',
          channel: currentChannel,
          position: currentChannel.position,
        });
        channelIndex++;
      }
    }

    return items;
  }, [categories, channels]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as Id<TableNames>);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'channel') {
      const newPosition = overData?.position ?? 0;
      const newCategoryId = overData?.categoryId;

      await moveChannel({
        channelId: active.id as Id<'channels'>,
        newCategoryId: newCategoryId || null,
        newPosition,
      });
    } else if (activeData?.type === 'category') {
      const newPosition = overData?.position ?? 0;

      await moveCategory({
        categoryId: active.id as Id<'channelCategories'>,
        newPosition,
      });
    }
  };

  const collapsedCategories = useMemo(
    () => new Set(collapsedCategoriesArray),
    [collapsedCategoriesArray],
  );

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoriesArray(prev => {
      const set = new Set(prev);
      if (set.has(categoryId)) {
        set.delete(categoryId);
      } else {
        set.add(categoryId);
      }
      return Array.from(set);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-0.5 py-2 flex-1">
        <SortableContext
          items={sortedItems.map(item =>
            item.type === 'category' ? item.category._id : item.channel._id,
          )}
          strategy={verticalListSortingStrategy}
        >
          {sortedItems.map(item => {
            if (item.type === 'category') {
              const isCollapsed = collapsedCategories?.has(item.category._id);

              return (
                <CategoryItem
                  key={item.category._id}
                  category={item.category}
                  channels={item.channels}
                  position={item.position}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleCategory(item.category._id)}
                />
              );
            } else {
              return (
                <ChannelItem
                  key={item.channel._id}
                  channel={item.channel}
                  position={item.position}
                  categoryId={null}
                  isActive={item.channel._id === channelId}
                />
              );
            }
          })}
        </SortableContext>
      </div>
      {createPortal(
        <DragOverlay>
          {activeId &&
            (() => {
              const activeItem = sortedItems.find(item =>
                item.type === 'category'
                  ? item.category._id === activeId
                  : item.channel._id === activeId,
              );
              if (!activeItem) return null;

              if (activeItem.type === 'category') {
                return (
                  <CategoryItem
                    category={activeItem.category}
                    channels={activeItem.channels}
                    position={activeItem.position}
                    isCollapsed={false}
                    onToggle={() => {}}
                  />
                );
              } else {
                return (
                  <ChannelItem
                    channel={activeItem.channel}
                    position={activeItem.position}
                    categoryId={null}
                    isActive={false}
                  />
                );
              }
            })()}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
});

ServerChannels.displayName = 'ServerChannels';

export default ServerChannels;
