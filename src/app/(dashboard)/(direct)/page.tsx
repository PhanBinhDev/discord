'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DirectActionParams } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { IconUser } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Dot } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import FriendsList from '../_components/friends-list';
import PendingRequestsList from '../_components/pending-requests-list';
import SearchAndAddFriend from '../_components/search-and-add-friend';
import SearchFriends from '../_components/search-friends';

const DashboardPage = () => {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounceValue(search, 500);
  const { data: hasFriends, isPending: isFriendsLoading } = useQuery(
    convexQuery(api.friends.hasFriends),
  );
  const { data: hasPending, isPending: isPendingPendingRequests } = useQuery(
    convexQuery(api.friends.hasPending),
  );
  const params = useSearchParams();
  const router = useRouter();
  const action = params.get('action');

  useEffect(() => {
    const hasPendingRequests = hasPending;

    if (
      action === DirectActionParams.PENDING_FRIEND_REQUESTS &&
      hasPendingRequests
    ) {
      return;
    }

    if (!hasFriends && action !== DirectActionParams.ADD_FRIEND) {
      return router.replace(`/?action=${DirectActionParams.ADD_FRIEND}`);
    }
  }, [action, hasFriends, hasPending, router]);

  const loading = isFriendsLoading || isPendingPendingRequests;

  return (
    <div className="flex flex-col bg-muted/80 h-full">
      <div className="p-2 px-4 border-border border-b flex items-center">
        <div className="flex items-center gap-1.5">
          <IconUser size={16} />
          <span className="font-medium text-sm">
            <TranslateText value="servers.directMessage.friends" />
          </span>
        </div>

        <Dot size={35} />

        {loading ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-8 w-20 rounded-md bg-background/40"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {hasFriends && (
              <>
                <Link href={`/?action=${DirectActionParams.ONLINE_FRIENDS}`}>
                  <Button
                    variant="ghost"
                    className="pr-2 pl-3 text-sm justify-center truncate hover:bg-muted-foreground/10"
                  >
                    <TranslateText value="servers.directMessage.online" />
                  </Button>
                </Link>

                <Link href={`/?action=${DirectActionParams.ALL_FRIENDS}`}>
                  <Button
                    variant="ghost"
                    className="pr-2 pl-3 text-sm justify-center truncate hover:bg-muted-foreground/10"
                  >
                    <TranslateText value="servers.directMessage.all" />
                  </Button>
                </Link>
              </>
            )}

            {hasPending && (
              <Link
                href={`/?action=${DirectActionParams.PENDING_FRIEND_REQUESTS}`}
              >
                <Button
                  variant="ghost"
                  className="pr-2 pl-3 text-sm justify-center truncate hover:bg-muted-foreground/10"
                >
                  <TranslateText value="servers.directMessage.pending" />
                </Button>
              </Link>
            )}

            <Link href={`/?action=${DirectActionParams.ADD_FRIEND}`}>
              <Button
                variant="ghost"
                className="pr-2 pl-3 text-sm justify-center bg-(--accent-color)/80 hover:bg-(--accent-color) truncate"
              >
                <TranslateText value="servers.directMessage.addFriend.title" />
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className="flex-1 p-5">
        {action === DirectActionParams.ADD_FRIEND && (
          <>
            <h1 className="font-medium text-lg mb-2">
              <TranslateText value="servers.directMessage.addFriend.title" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <TranslateText value="servers.directMessage.addFriend.description" />
            </p>
            <SearchAndAddFriend />
          </>
        )}

        {action === DirectActionParams.ONLINE_FRIENDS && (
          <>
            <SearchFriends value={search} onChange={setSearch} />
            <ScrollArea className="h-[calc(100vh-200px)]">
              <FriendsList search={debounced} statusFilter="online" />
            </ScrollArea>
          </>
        )}

        {action === DirectActionParams.ALL_FRIENDS && (
          <>
            <SearchFriends value={search} onChange={setSearch} />
            <ScrollArea className="h-[calc(100vh-200px)]">
              <FriendsList search={debounced} statusFilter="all" />
            </ScrollArea>
          </>
        )}
        {action === DirectActionParams.PENDING_FRIEND_REQUESTS && (
          <>
            <SearchFriends value={search} onChange={setSearch} />
            <ScrollArea className="h-[calc(100vh-200px)]">
              <PendingRequestsList search={debounced} />
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
