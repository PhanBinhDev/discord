'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_LIMIT } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { cn } from '@/lib/utils';
import { getByPath, getInitials } from '@/utils';
import {
  IconAlertCircle,
  IconBell,
  IconCheck,
  IconMessage,
  IconPhone,
  IconX,
} from '@tabler/icons-react';
import { usePaginatedQuery } from 'convex/react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import Link from 'next/link';
import { useMemo } from 'react';

type Notification = Doc<'notifications'>;

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'call_incoming':
    case 'call_missed':
      return <IconPhone className="h-5 w-5" />;
    case 'message':
    case 'mention':
      return <IconMessage className="h-5 w-5" />;
    case 'friend_request':
    case 'friend_accepted':
    case 'server_invite':
      return <IconBell className="h-5 w-5" />;
    case 'system':
      return <IconAlertCircle className="h-5 w-5" />;
    default:
      return <IconBell className="h-5 w-5" />;
  }
}

interface NotificationItemProps {
  notification: Notification;
  locale: typeof vi | typeof enUS;
  onMarkAsRead: (id: Id<'notifications'>) => void;
  onDelete: (id: Id<'notifications'>) => void;
}

function ServerInviteNotification({
  notification,
  locale,
  onDelete,
}: NotificationItemProps) {
  const { dict } = useClientDictionary();
  const actorName = notification.actorName || '';
  const { mutate: acceptInvite, pending: isAccepting } = useApiMutation(
    api.servers.joinServer,
  );
  const { mutate: declineInvite, pending: isDeclining } = useApiMutation(
    api.notifications.deleteNotification,
  );

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log('Accepting invite', notification.metadata?.inviteCode);

      await acceptInvite({ inviteCode: notification.metadata?.inviteCode });
      onDelete(notification._id);
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await declineInvite({ notificationId: notification._id });
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-(--accent-color)/10 transition-colors group">
      {notification.actorImageUrl ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={notification.actorImageUrl} alt={actorName} />
          <AvatarFallback className="bg-(--accent-color)/10 text-(--accent-color) text-xs">
            {getInitials(actorName || 'N')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-(--accent-color)/10 text-(--accent-color) flex items-center justify-center">
          <NotificationIcon type={notification.type} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">
          {(() => {
            const translated = getByPath(dict, notification.title);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.title;
          })()}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {(() => {
            const translated = getByPath(dict, notification.message);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.message;
          })()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification._creationTime, {
            addSuffix: true,
            locale,
          })}
        </p>

        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            loading={isAccepting}
          >
            <TranslateText value="notifications.accept" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            loading={isDeclining}
          >
            <TranslateText value="notifications.decline" />
          </Button>
        </div>
      </div>

      <button
        className="p-1 hover:bg-destructive/10 rounded self-start opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => {
          e.stopPropagation();
          onDelete(notification._id);
        }}
        title="Delete"
      >
        <IconX className="h-4 w-4 text-destructive" />
      </button>
    </div>
  );
}

function FriendRequestNotification({
  notification,
  locale,
  onDelete,
}: NotificationItemProps) {
  const { dict } = useClientDictionary();
  const actorName = notification.actorName || '';
  const { mutate: acceptFriend, pending: isAccepting } = useApiMutation(
    api.friends.acceptFriendRequest,
  );
  const { mutate: rejectFriend, pending: isRejecting } = useApiMutation(
    api.friends.rejectFriendRequest,
  );

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (notification.metadata?.friendshipId) {
        await acceptFriend({
          friendRequestId: notification.metadata.friendshipId as Id<'friends'>,
        });
        onDelete(notification._id);
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (notification.metadata?.friendshipId) {
        await rejectFriend({
          friendRequestId: notification.metadata.friendshipId,
        });
        onDelete(notification._id);
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-(--accent-color)/10 transition-colors group">
      {notification.actorImageUrl ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={notification.actorImageUrl} alt={actorName} />
          <AvatarFallback className="bg-(--accent-color)/10 text-(--accent-color) text-xs">
            {getInitials(actorName || 'N')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-(--accent-color)/10 text-(--accent-color) flex items-center justify-center">
          <NotificationIcon type={notification.type} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">
          {(() => {
            const translated = getByPath(dict, notification.title);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.title;
          })()}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {(() => {
            const translated = getByPath(dict, notification.message);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.message;
          })()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification._creationTime, {
            addSuffix: true,
            locale,
          })}
        </p>

        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            loading={isAccepting}
          >
            <TranslateText value="notifications.accept" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            loading={isRejecting}
          >
            <TranslateText value="notifications.decline" />
          </Button>
        </div>
      </div>

      <button
        className="p-1 hover:bg-destructive/10 rounded self-start opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => {
          e.stopPropagation();
          onDelete(notification._id);
        }}
        title="Delete"
      >
        <IconX className="h-4 w-4 text-destructive" />
      </button>
    </div>
  );
}

function DefaultNotification({
  notification,
  locale,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const { dict } = useClientDictionary();
  const actorName = notification.actorName || '';

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-(--accent-color)/10 transition-colors cursor-pointer group"
      onClick={() => onMarkAsRead(notification._id)}
    >
      {notification.actorImageUrl ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={notification.actorImageUrl} alt={actorName} />
          <AvatarFallback className="bg-(--accent-color)/10 text-(--accent-color) text-xs">
            {getInitials(actorName || 'N')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-(--accent-color)/10 text-(--accent-color) flex items-center justify-center">
          <NotificationIcon type={notification.type} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium line-clamp-1 ${notification.read ? 'opacity-60' : ''}`}
        >
          {(() => {
            const translated = getByPath(dict, notification.title);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.title;
          })()}
        </p>
        <p
          className={`text-xs text-muted-foreground line-clamp-2 mt-0.5 ${notification.read ? 'opacity-60' : ''}`}
        >
          {(() => {
            const translated = getByPath(dict, notification.message);
            if (translated && typeof translated === 'string') {
              return translated.replace(/{{name}}/g, actorName);
            }
            return notification.message;
          })()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification._creationTime, {
            addSuffix: true,
            locale,
          })}
        </p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
        {!notification.read && (
          <button
            className="p-1 hover:bg-background rounded"
            onClick={e => {
              e.stopPropagation();
              onMarkAsRead(notification._id);
            }}
            title="Mark as read"
          >
            <IconCheck className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <button
          className="p-1 hover:bg-destructive/10 rounded"
          onClick={e => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          title="Delete"
        >
          <IconX className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}

function NotificationItem(props: NotificationItemProps) {
  switch (props.notification.type) {
    case 'server_invite':
    case 'server_invite_pending':
      return <ServerInviteNotification {...props} />;
    case 'friend_request':
      return <FriendRequestNotification {...props} />;
    default:
      return <DefaultNotification {...props} />;
  }
}

interface NotificationBellProps {
  size: 'small' | 'medium' | 'large';
}

export function NotificationBell({ size }: NotificationBellProps) {
  const { locale: lang } = useClientDictionary();
  const paginatedResult = usePaginatedQuery(
    api.notifications.getUserNotifications,
    { filter: 'all' },
    { initialNumItems: DEFAULT_LIMIT },
  );

  const notifications = useMemo(() => {
    if (!paginatedResult) return [];
    return paginatedResult.results;
  }, [paginatedResult]);

  const { mutate: markAsRead } = useApiMutation(api.notifications.markAsRead);
  const { mutate: markAllAsRead, pending: isMarkingAllAsRead } = useApiMutation(
    api.notifications.markAllAsRead,
  );
  const { mutate: deleteNotification } = useApiMutation(
    api.notifications.deleteNotification,
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleMarkAsRead = async (notificationId: Id<'notifications'>) => {
    await markAsRead({ notificationId });
  };

  const handleDelete = async (notificationId: Id<'notifications'>) => {
    await deleteNotification({ notificationId });
  };

  const locale = lang === 'vi' ? vi : enUS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative',
            size === 'small'
              ? 'h-6.5 w-6.5'
              : size === 'large'
                ? 'h-10 w-10'
                : 'h-9 w-9',
          )}
        >
          <IconBell
            className={`text-(--accent-color) ${
              size === 'small'
                ? 'h-4 w-4'
                : size === 'large'
                  ? 'h-6 w-6'
                  : 'h-5 w-5'
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-(--accent-color) text-white text-[10px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 bg-muted border-muted-foreground/20"
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base text-foreground">
              <TranslateText value="notifications.title" />
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-foreground/60">
                {unreadCount} mới
              </span>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            {paginatedResult.status === 'LoadingFirstPage' ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-(--accent-color)" />
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-8">
                  <TranslateText value="notifications.empty" />
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(notification => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    locale={locale}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="w-full"
                disabled={isMarkingAllAsRead}
                loading={isMarkingAllAsRead}
              >
                <TranslateText value="notifications.markAllRead" />
              </Button>
            )}
            <Button asChild variant="link" size="sm" className="w-full">
              <Link href="/servers/notifications">
                <TranslateText value="notifications.viewAll" />
              </Link>
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
