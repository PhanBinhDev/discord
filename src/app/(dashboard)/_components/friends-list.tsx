'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_LIMIT, FriendContextMenuItems } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import useModal from '@/hooks/use-modal';
import { DictKey } from '@/internationalization/get-dictionaries';
import { ApiPaginatedReturn, FriendContextAction } from '@/types';
import { getUsernameDisplay } from '@/utils';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { usePaginatedQuery } from 'convex/react';
import { memo } from 'react';

interface FriendsListProps {
  search: string;
  statusFilter: 'online' | 'all';
}

const FriendsList = memo(({ search, statusFilter }: FriendsListProps) => {
  const { openModal } = useModal();
  const { results, status, loadMore } = usePaginatedQuery(
    api.friends.getFriends,
    { search, statusFilter },
    { initialNumItems: DEFAULT_LIMIT },
  );

  const { data: servers, isLoading: isLoadingServers } = useQuery({
    ...convexQuery(api.servers.getUserServers),
  });

  const { mutate: removeFriend } = useApiMutation(api.friends.removeFriend);

  const handleClickContextItem = (
    action: FriendContextAction,
    data: {
      friend: ApiPaginatedReturn<typeof api.friends.getFriends>;
    },
  ) => {
    switch (action) {
      case 'profile':
        openModal('ModalUserDetails', {
          user: data.friend,
        });
        break;
      case 'remove_friend':
        removeFriend({
          friendId: data.friend.friendshipId,
        });
        break;
      default:
        break;
    }
  };

  if (status === 'LoadingFirstPage') {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const friends = (results ?? []) as ApiPaginatedReturn<
    typeof api.friends.getFriends
  >[];

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>
          <TranslateText
            value={`servers.directMessage.noResult.${statusFilter}` as DictKey}
          />
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {friends.map(friend => {
        return (
          <ContextMenu key={friend.friendshipId}>
            <ContextMenuTrigger>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted-foreground/10 group cursor-pointer"
                onClick={() =>
                  openModal('ModalUserDetails', {
                    user: friend,
                  })
                }
              >
                <div className="relative">
                  <UserAvatar
                    src={friend.user.avatarUrl}
                    name={friend.user.displayName || friend.user.username}
                    showTooltip={false}
                  />
                  {friend.user.status === 'online' && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {friend.user.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {getUsernameDisplay(friend.user)}
                  </p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="rounded-md bg-muted p-2">
              {FriendContextMenuItems().map(item => {
                const ItemIcon = item.icon;

                if (item.action === 'invite_server') {
                  return (
                    <ContextMenuSub key={item.key}>
                      <ContextMenuSubTrigger className="cursor-pointer flex items-center gap-2 group">
                        <ItemIcon className="size-4 group-hover:text-inherit" />
                        <TranslateText value={item.label} />
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="rounded-md bg-muted p-2 min-w-40">
                        {isLoadingServers ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-5 w-40 rounded-sm bg-background/40" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          servers?.map(server => (
                            <ContextMenuItem
                              key={server._id}
                              className="cursor-pointer flex items-center gap-2 group"
                              onClick={() => {
                                openModal('ModalInviteToServer', {
                                  server,
                                  user: friend,
                                });
                              }}
                            >
                              {server.name}
                            </ContextMenuItem>
                          ))
                        )}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  );
                }

                return (
                  <div key={item.key}>
                    <ContextMenuItem
                      className={`cursor-pointer flex items-center gap-2 ${item.action === 'block' ? 'text-destructive' : ''} group`}
                      onClick={() =>
                        handleClickContextItem(item.action, {
                          friend,
                        })
                      }
                    >
                      <ItemIcon className="size-4 group-hover:text-inherit" />
                      <TranslateText value={item.label} />
                    </ContextMenuItem>
                  </div>
                );
              })}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      {status === 'CanLoadMore' && (
        <Button
          onClick={() => loadMore(20)}
          variant="ghost"
          className="w-full mt-2"
        >
          <TranslateText value="common.loadMore" />
        </Button>
      )}
      {status === 'LoadingMore' && (
        <div className="space-y-2 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

FriendsList.displayName = 'FriendsList';

export default FriendsList;
