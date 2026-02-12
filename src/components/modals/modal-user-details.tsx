import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Card } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FriendContextMenuItems, getUserDetailsTabs } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import useModal from '@/hooks/use-modal';
import { ApiPaginatedReturn } from '@/types';
import { getUsernameDisplay } from '@/utils';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { VisuallyHidden } from 'radix-ui';
import { useMemo } from 'react';

const ModalUserDetails = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { user } = getModalData('ModalUserDetails') as {
    user: ApiPaginatedReturn<typeof api.friends.getFriends>;
  };

  const { data: commonCounts } = useQuery(
    convexQuery(api.users.getCommonDetails, { targetUserId: user.user._id }),
  );
  const tabs = useMemo(() => {
    return getUserDetailsTabs({
      commonFriends: commonCounts?.commonFriends,
      commonServers: commonCounts?.commonServers,
    });
  }, [commonCounts]);

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalUserDetails')}
      open={isModalOpen('ModalUserDetails')}
    >
      <DialogContent
        className="sm:max-w-5xl h-[84vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>
            <TranslateText value="servers.userDetails.title" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.userDetails.description" />
          </DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-6 flex gap-2">
          <Card className="w-[400px]"></Card>
          <Tabs defaultValue="activity" className="flex-1">
            <TabsList className="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0 border-b border-border pb-2">
              {tabs.map(tab => {
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="relative h-auto cursor-pointer rounded-md border-0 bg-transparent px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <TranslateText {...tab.label} />
                    <span className="pointer-events-none absolute -bottom-px left-0 right-0 h-1 bg-transparent data-[state=active]:bg-(--accent-color)" />
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent
              value="activity"
              className="p-4 flex items-center justify-center"
            >
              <div className="flex items-center justify-center">
                <p className="text-muted-foreground">
                  <TranslateText value="servers.userDetails.tabs.noActivity" />
                </p>
              </div>
            </TabsContent>
            <TabsContent value="friend">
              {commonCounts?.friends.length === 0 ? (
                <div className="flex items-center justify-center flex-1 h-full">
                  <p className="text-muted-foreground">
                    <TranslateText value="servers.userDetails.tabs.noCommonFriends" />
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-3 py-2">
                    {commonCounts?.friends.map(friend => (
                      <ContextMenu key={friend._id}>
                        <ContextMenuTrigger>
                          <Item variant="outline" className="rounded-md p-3">
                            <ItemMedia>
                              <UserAvatar
                                src={friend.avatarUrl}
                                name={friend.displayName || friend.username}
                                showTooltip={false}
                                size={10}
                                status={{ size: 4, status: friend.status }}
                              />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle className="truncate">
                                {friend.displayName || friend.username}
                              </ItemTitle>
                              <ItemDescription>
                                {getUsernameDisplay(friend)}
                              </ItemDescription>
                            </ItemContent>
                          </Item>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="rounded-md">
                          {FriendContextMenuItems().map(item => {
                            const ItemIcon = item.icon;

                            return (
                              <div key={item.key}>
                                <ContextMenuItem
                                  className={`cursor-pointer flex items-center gap-2 ${item.action === 'block' ? 'text-destructive' : ''}`}
                                  onClick={() => {}}
                                >
                                  <ItemIcon className="size-4" />
                                  <TranslateText value={item.label} />
                                </ContextMenuItem>
                              </div>
                            );
                          })}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="server" className="flex">
              {commonCounts?.servers.length === 0 ? (
                <div className="flex items-center justify-center flex-1 h-full">
                  <p className="text-muted-foreground">
                    <TranslateText value="servers.userDetails.tabs.noCommonServers" />
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full flex-1">
                  <div className="space-y-3 py-2">
                    {commonCounts?.servers.map(server => {
                      const targetChannelId =
                        server.defaultChannelId ||
                        server.lastViewedChannelId ||
                        null;
                      const serverHref = (
                        targetChannelId
                          ? `/servers/${server._id}/channels/${targetChannelId}`
                          : `/servers/${server._id}`
                      ) as Route;
                      return (
                        <Link
                          key={server._id}
                          href={serverHref}
                          onClick={() => closeModal('ModalUserDetails')}
                        >
                          <Item
                            variant="outline"
                            className="rounded-md hover:bg-muted-foreground/10 p-3 cursor-pointer"
                          >
                            <ItemMedia variant="image">
                              <Image
                                src={server.iconUrl || '/icons/icon1.png'}
                                alt={server.name}
                                width={40}
                                height={40}
                              />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle className="truncate">
                                {server.name}
                              </ItemTitle>
                              {server.description ? (
                                <ItemDescription>
                                  {server.description}
                                </ItemDescription>
                              ) : null}
                              <div className="text-xs text-muted-foreground">
                                {server.memberCount}{' '}
                                <TranslateText value="servers.members" />
                              </div>
                            </ItemContent>
                          </Item>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUserDetails;
