'use client';

import Spinner from '@/components/shared/spinner';
import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { ApiReturn } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDebounceValue } from 'usehooks-ts';

const ModalInvitePeople = () => {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounceValue(search, 300);
  const { dict } = useClientDictionary();
  const { closeModal, isModalOpen, getModalData } = useModal();

  const { server } = getModalData('ModalInvitePeople') as {
    server: ApiReturn<typeof api.servers.getServerById> | null | undefined;
  };

  const { data: users, isLoading: isLoadingUsers } = useQuery(
    convexQuery(api.users.searchUsers, {
      query: debounced,
    }),
  );

  const { mutate: inviteUserToServer, pending } = useApiMutation(
    api.servers.inviteUserToServer,
  );

  const handleInvite = (user: ApiReturn<typeof api.users.searchUsers>[0]) => {
    if (!server) return;

    inviteUserToServer({
      serverId: server?._id,
      targetUserId: user._id,
    })
      .then(() => {
        toast.success(dict?.servers.invite.inviteSuccess);
      })
      .catch(() => {
        toast.error(dict?.servers.invite.inviteFailed);
      });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalInvitePeople')}
      open={isModalOpen('ModalInvitePeople')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">
            <TranslateText value="servers.invite.title" />
          </DialogTitle>
          <DialogDescription className="text-start">
            <TranslateText
              value="servers.invite.description"
              params={{
                channel: server?.channels?.[0]?.name || 'general',
              }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder={dict?.servers.invite.placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <ScrollArea className="h-70">
            {isLoadingUsers ? (
              <div className="px-4 py-6 flex items-center justify-center">
                <Spinner size={20} />
              </div>
            ) : (
              <>
                {users?.length === 0 ? (
                  <div className="px-4 py-6 flex items-center justify-center text-sm text-muted-foreground">
                    <TranslateText value="servers.invite.noUsersFound" />
                  </div>
                ) : (
                  <>
                    {users?.map(user => {
                      return (
                        <div
                          className="flex items-center p-2 rounded-md hover:bg-muted-foreground/10 cursor-pointer mb-1"
                          key={user._id}
                        >
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              size={8}
                              showTooltip={false}
                              src={user.avatarUrl}
                            />

                            <div className="flex flex-col leading-tight">
                              <span className="font-semibold text-foreground text-[15px] mb-0.5">
                                {user.displayName}
                              </span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {user.username}#{user.discriminator}
                              </span>
                            </div>
                          </div>

                          <Button
                            className="ml-auto bg-muted-foreground/15 hover:bg-muted-foreground/20"
                            variant={'ghost'}
                            size="sm"
                            disabled={pending}
                            loading={pending}
                            onClick={() => handleInvite(user)}
                          >
                            <TranslateText value="common.invite" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </ScrollArea>

          <DialogFooter></DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalInvitePeople;
