'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_LIMIT } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import useModal from '@/hooks/use-modal';
import { DictKey } from '@/internationalization/get-dictionaries';
import { ApiPaginatedReturn } from '@/types';
import { getUsernameDisplay } from '@/utils';
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
      {friends.map(friend => (
        <div
          key={friend.friendshipId}
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
            <p className="font-medium truncate">{friend.user.displayName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {getUsernameDisplay(friend.user)}
            </p>
          </div>
          {/* <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100"
            onClick={e => {
              e.stopPropagation();
              console.log('hello');
            }}
          >
            <IconDots size={18} />
          </Button> */}
        </div>
      ))}
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
