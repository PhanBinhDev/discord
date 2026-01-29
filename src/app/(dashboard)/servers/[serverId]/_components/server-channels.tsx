'use client';

import { DragType } from '@/constants/app';
import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ApiReturn, ChannelWithCategory, RenderItem } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { memo, useCallback, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import CategoryItem from './category-item';
import ChannelItem from './channel-item';

interface ServerChannelsProps {
  server: ApiReturn<typeof api.servers.getServerById> | null | undefined;
}

const ServerChannels = memo(({ server }: ServerChannelsProps) => {
  const [collapsedCategoriesArray, setCollapsedCategoriesArray] =
    useLocalStorage<string[]>(
      LOCAL_STORAGE_KEY.SERVER_CHANNELS_COLLAPSED_CATEGORIES,
      [],
    );

  const params = useParams();
  const channelId = params?.channelId as Id<'channels'> | undefined;

  // Fetch categories (always show all categories by position)
  const { data: categories } = useQuery(
    convexQuery(api.servers.getServerCategories, {
      serverId: server?._id as Id<'servers'>,
    }),
  );

  // Fetch accessible channels
  const { data: channelsData } = useQuery(
    convexQuery(api.servers.getAccessibleChannels, {
      serverId: server?._id as Id<'servers'>,
    }),
  );

  const sortedItems = useMemo((): RenderItem[] => {
    if (!categories || !channelsData?.channels) return [];

    const items: RenderItem[] = [];

    // Group channels by category
    const channelsByCategory = new Map<string, ChannelWithCategory[]>();
    const uncategorizedChannels: ChannelWithCategory[] = [];

    channelsData.channels.forEach(channel => {
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

    // Sort channels within each category by position
    channelsByCategory.forEach(chans => {
      chans.sort((a, b) => a.position - b.position);
    });

    // Sort uncategorized channels by position
    uncategorizedChannels.sort((a, b) => a.position - b.position);

    // Merge categories and uncategorized channels by position
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
        // Add category (even if empty)
        items.push({
          type: DragType.CATEGORY,
          category: currentCategory,
          channels: channelsByCategory.get(currentCategory._id) || [],
          position: currentCategory.position,
        });
        categoryIndex++;
      } else if (currentChannel) {
        // Add uncategorized channel
        items.push({
          type: DragType.CHANNEL,
          channel: currentChannel,
          position: currentChannel.position,
        });
        channelIndex++;
      }
    }

    return items;
  }, [categories, channelsData?.channels]);

  const collapsedCategories = useMemo(
    () => new Set(collapsedCategoriesArray),
    [collapsedCategoriesArray],
  );

  const toggleCategory = useCallback(
    (categoryId: string) => {
      setCollapsedCategoriesArray(prev => {
        const set = new Set(prev);
        if (set.has(categoryId)) {
          set.delete(categoryId);
        } else {
          set.add(categoryId);
        }
        return Array.from(set);
      });
    },
    [setCollapsedCategoriesArray],
  );

  if (!server) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a server
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2 flex-1 overflow-y-auto">
      {sortedItems.map(item => {
        if (item.type === DragType.CATEGORY) {
          const isCollapsed = collapsedCategories?.has(item.category._id);

          return (
            <CategoryItem
              key={item.category._id}
              category={item.category}
              channels={item.channels}
              isCollapsed={isCollapsed}
              onToggle={() => toggleCategory(item.category._id)}
            />
          );
        } else {
          return (
            <ChannelItem
              key={item.channel._id}
              channel={item.channel}
              isActive={item.channel._id === channelId}
            />
          );
        }
      })}
    </div>
  );
});

ServerChannels.displayName = 'ServerChannels';

export default ServerChannels;
