import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';
import { ApiReturn } from '@/types';
import moment from 'moment';

interface ChatItemProps {
  message: ApiReturn<typeof api.conversation.getMessages>['page'][number];
}

const ChatItem = ({ message }: ChatItemProps) => {

  return (
    <div className="relative group flex items-center hover:bg-muted-foreground/5 p-3 rounded-md transition w-full">
      <div className="group flex gap-x-2 items-center w-full">
        <div
          onClick={() => {}}
          className="cursor-pointer hover:drop-shadow-md transition self-start"
        >
          <UserAvatar
            src={message.sender.avatarUrl}
            name={message.sender.displayName}
            showTooltip={false}
            border={false}
          />
        </div>
        <div className="flex flex-col w-full">
          <div className="flex items-center gap-x-2">
            <div className="flex items-center">
              <p
                onClick={() => {}}
                className="font-semibold text-sm hover:underline cursor-pointer"
              >
                {message.sender.displayName}
              </p>
            </div>
            <span className="text-xs">
              {moment(message._creationTime).format('MM/DD/YYYY HH:mm')}
            </span>
          </div>

          <p
            className={cn(
              'text-sm text-zinc-600 dark:text-zinc-300',
              message.deletedAt &&
                'italic to-zinc-500 dark:text-zinc-400 text-xs mt-1',
            )}
          >
            {message.content}
            {message.editedAt && !message.deletedAt && (
              <span className="text-[10px] mx-2">
                (
                <TranslateText value="servers.directMessage.conversation.chat.edited" />
                )
              </span>
            )}
          </p>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
