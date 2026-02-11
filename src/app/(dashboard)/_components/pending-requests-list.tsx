'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_LIMIT } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { ApiPaginatedReturn } from '@/types';
import { getUsernameDisplay } from '@/utils';
import { IconCheck, IconX } from '@tabler/icons-react';
import { usePaginatedQuery } from 'convex/react';
import { memo } from 'react';
import { toast } from 'sonner';

interface PendingRequestsListProps {
  search: string;
}

const PendingRequestsList = memo(({ search }: PendingRequestsListProps) => {
  const { dict } = useClientDictionary();
  const { results, status, loadMore } = usePaginatedQuery(
    api.friends.getPendingRequests,
    { search },
    { initialNumItems: DEFAULT_LIMIT },
  );

  const { mutate: acceptRequest, pending: acceptPending } = useApiMutation(
    api.friends.acceptFriendRequest,
  );

  const { mutate: rejectRequest, pending: rejectPending } = useApiMutation(
    api.friends.rejectFriendRequest,
  );

  const handleAccept = (requestId: Id<'friends'>) => {
    acceptRequest({ friendRequestId: requestId })
      .then(() => {
        toast.success(dict?.servers.directMessage.accepted);
      })
      .catch(() => {
        toast.error(dict?.servers.directMessage.failedToAccept);
      });
  };

  const handleReject = (requestId: Id<'friends'>) => {
    rejectRequest({ friendRequestId: requestId })
      .then(() => {
        toast.success(dict?.servers.directMessage.rejected);
      })
      .catch(() => {
        toast.error(dict?.servers.directMessage.failedToReject);
      });
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

  const requests = (results ?? []) as ApiPaginatedReturn<
    typeof api.friends.getPendingRequests
  >[];

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>
          <TranslateText value="servers.directMessage.noResult.pending" />
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {requests.map(request => (
        <div
          key={request.requestId}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted-foreground/10"
        >
          <UserAvatar
            src={request.from.avatarUrl}
            name={request.from.displayName || request.from.username}
            showTooltip={false}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{request.from.displayName}</p>
            <p className="text-sm text-muted-foreground">
              {getUsernameDisplay(request.from)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleAccept(request.requestId)}
              disabled={acceptPending || rejectPending}
            >
              <IconCheck size={18} className="text-green-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleReject(request.requestId)}
              disabled={acceptPending || rejectPending}
            >
              <IconX size={18} className="" />
            </Button>
          </div>
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

PendingRequestsList.displayName = 'PendingRequestsList';

export default PendingRequestsList;
