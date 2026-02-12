import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_LIMIT, MAX_GROUP_MEMBER } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { ApiPaginatedReturn } from '@/types';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { usePaginatedQuery } from 'convex/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const ModalCreateDirectMessage = () => {
  const [selectedFriends, setSelectedFriends] = useState<Id<'users'>[]>([]);
  const [search, setSearch] = useState('');
  const [debounced] = useDebounceValue(search, 500);
  const { closeModal, isModalOpen, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const router = useRouter()

  const { hasFriends } = getModalData('ModalCreateDirectMessage') || {
    hasFriends: false,
  };

  const { mutate: getOrCreateConversation, pending: isCreatingDirectMessage } =
    useApiMutation(api.conversation.getOrCreateConversationForMembers);

  const { results, status, loadMore } = usePaginatedQuery(
    api.friends.getFriends,
    { search: debounced, statusFilter: 'all' },
    { initialNumItems: DEFAULT_LIMIT },
  );

  const friends = (results ?? []) as ApiPaginatedReturn<
    typeof api.friends.getFriends
  >[];

  const toggleFriend = (userId: Id<'users'>) => {
    setSelectedFriends(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateDM = () => {
    getOrCreateConversation({
      memberIds: selectedFriends,
    })
      .then(data => {
        if (data.created) toast.success(dict?.servers.directMessage.created);
        
        router.push(`/conversations/${data.conversationId}`);
      })
      .catch(() => {
        toast.error(dict?.servers.directMessage.createError);
      });
    closeModal('ModalCreateDirectMessage');
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateDirectMessage')}
      open={isModalOpen('ModalCreateDirectMessage')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.directMessage.selectFriend" />
          </DialogTitle>
          <DialogDescription className="pt-2">
            <TranslateText
              value={
                selectedFriends.length === MAX_GROUP_MEMBER - 1
                  ? 'servers.directMessage.selectLimits'
                  : !hasFriends
                    ? 'servers.directMessage.noFriends'
                    : 'servers.directMessage.selectFriendsToAdd'
              }
              params={{
                remain: MAX_GROUP_MEMBER - 1 - selectedFriends.length,
              }}
            />
          </DialogDescription>
        </DialogHeader>

        {!hasFriends ? (
          <Button
            className="w-full bg-(--accent-color) hover:bg-(--accent-hover) text-white"
            onClick={() => closeModal('ModalCreateDirectMessage')}
          >
            <TranslateText value="servers.directMessage.addFriend.title" />
          </Button>
        ) : (
          <>
            <Input
              placeholder={dict?.servers.directMessage.addDM.placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <ScrollArea className="h-80">
              {status === 'LoadingFirstPage' ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <TranslateText value="servers.directMessage.noResult.all" />
                </div>
              ) : (
                <div className="space-y-1">
                  {friends.map(friend => {
                    const isSelected = selectedFriends.includes(
                      friend.user._id,
                    );
                    const isDisabled =
                      !isSelected &&
                      selectedFriends.length >= MAX_GROUP_MEMBER - 1;

                    return (
                      <div
                        key={friend.friendshipId}
                        className="flex items-center gap-3 p-2 pr-3 rounded-md hover:bg-muted-foreground/10 cursor-pointer"
                        onClick={() =>
                          !isDisabled && toggleFriend(friend.user._id)
                        }
                      >
                        <UserAvatar
                          src={friend.user.avatarUrl}
                          name={friend.user.displayName || friend.user.username}
                          showTooltip={false}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {friend.user.displayName || friend.user.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {friend.user.username}
                          </p>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          className="cursor-pointer"
                        />
                      </div>
                    );
                  })}

                  {status === 'CanLoadMore' && (
                    <Button
                      onClick={() => loadMore(DEFAULT_LIMIT)}
                      variant="ghost"
                      className="w-full mt-2"
                      size="sm"
                    >
                      <TranslateText value="common.loadMore" />
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => closeModal('ModalCreateDirectMessage')}
                className="flex-1 hover:bg-muted-foreground/10"
              >
                <TranslateText value="common.cancel" />
              </Button>
              <Button
                onClick={handleCreateDM}
                disabled={
                  selectedFriends.length === 0 || isCreatingDirectMessage
                }
                loading={isCreatingDirectMessage}
                className="flex-1 bg-(--accent-color) hover:bg-(--accent-hover) text-white"
              >
                <TranslateText value="servers.directMessage.create" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateDirectMessage;
