'use client';

import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';
import { ApiReturn } from '@/types';
import {
  IconCopy,
  IconCornerDownRight,
  IconDotsVertical,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Image from 'next/image';
import { useState } from 'react';

type Message = ApiReturn<typeof api.conversation.getMessages>[number];

interface MessageItemProps {
  message: Message;
  isGrouped?: boolean;
  currentUserId: string;
}

const MessageItem = ({
  message,
  isGrouped = false,
  currentUserId,
}: MessageItemProps) => {
  const [showActions, setShowActions] = useState(false);
  const isOwnMessage = message.sender._id === currentUserId;

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm', { locale: vi });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleEdit = () => {
    // TODO: Implement edit
  };

  const handleDelete = () => {
    // TODO: Implement delete
  };

  const handleReply = () => {
    // TODO: Implement reply
  };

  return (
    <div
      className={cn(
        'group relative px-4 hover:bg-muted/50 transition-colors',
        isGrouped ? 'py-0.5' : 'py-2',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar - only show if not grouped */}
        {!isGrouped ? (
          <UserAvatar
            src={message.sender.avatarUrl}
            name={message.sender.displayName || message.sender.username}
            size={10}
            showTooltip={false}
            border={false}
          />
        ) : (
          <div className="w-10 flex items-center justify-center">
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message._creationTime)}
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header - only show if not grouped */}
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-sm">
                {message.sender.displayName || message.sender.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(message._creationTime)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-muted-foreground italic">
                  (đã chỉnh sửa)
                </span>
              )}
            </div>
          )}

          {/* Message Text */}
          {message.content && (
            <div className="text-sm wrap-break-word whitespace-pre-wrap">
              {message.deletedAt ? (
                <span className="italic text-muted-foreground">
                  {message.content}
                </span>
              ) : (
                message.content
              )}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => {
                const isImage = attachment.type.startsWith('image/');
                const isVideo = attachment.type.startsWith('video/');

                return (
                  <div key={index} className="relative">
                    {isImage && (
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        width={300}
                        height={300}
                        className="rounded-md max-w-md object-cover"
                      />
                    )}
                    {isVideo && (
                      <video
                        src={attachment.url}
                        controls
                        className="rounded-md max-w-md"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {!isImage && !isVideo && (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {attachment.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {showActions && !message.deletedAt && (
          <div className="absolute -top-3 right-4 bg-background border rounded-md shadow-sm flex items-center">
            {isOwnMessage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleEdit}
                >
                  <IconEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReply}
            >
              <IconCornerDownRight className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <IconDotsVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <IconCopy className="h-4 w-4 mr-2" />
                  Copy text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
