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
      className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
      onClick={() => onMarkAsRead(notification._id)}
    >
      {notification.actorImageUrl ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={notification.actorImageUrl} alt={actorName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(actorName || 'N')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
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
    default:
      return <DefaultNotification {...props} />;
  }
}

export function NotificationBell() {
  const { locale: lang } = useClientDictionary();
  const { results: notifications, status } = usePaginatedQuery(
    api.notifications.getUserNotifications,
    { filter: 'all' },
    { initialNumItems: DEFAULT_LIMIT },
  );
  const { mutate: markAsRead } = useApiMutation(api.notifications.markAsRead);
  const { mutate: markAllAsRead, pending: isMarkingAllAsRead } = useApiMutation(
    api.notifications.markAllAsRead,
  );
  const { mutate: deleteNotification } = useApiMutation(
    api.notifications.deleteNotification,
  );

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

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
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">
              <TranslateText value="notifications.title" />
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} mới
              </span>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            {status === 'LoadingFirstPage' ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
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
              <Link href="/dashboard/notifications">
                <TranslateText value="notifications.viewAll" />
              </Link>
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
