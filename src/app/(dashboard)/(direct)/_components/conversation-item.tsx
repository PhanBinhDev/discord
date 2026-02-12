import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { DEFAULT_ICON_URL } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { cn } from '@/lib/utils';
import { ApiReturn } from '@/types';
import { IconX } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useState } from 'react';

interface ConversationItemProps {
  conversation: ApiReturn<typeof api.conversation.getConversations>[number];
  isActive: boolean;
}

const ConversationItem = memo(
  ({ conversation, isActive }: ConversationItemProps) => {
    const [hover, setHover] = useState(false);

    const { mutate: hideConversation, pending: isHiding } = useApiMutation(
      api.conversation.hideConversation,
    );

    return (
      <Link
        href={`/conversations/${conversation._id.toString()}`}
        className={cn(
          'flex items-center gap-2 pr-2 pl-1.5 py-1.5 h-10.5 mx-2 text-sm rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground',
          !isActive && 'text-muted-foreground',
        )}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {conversation.type === 'direct' ? (
          <UserAvatar
            src={conversation.iconUrl || DEFAULT_ICON_URL}
            showTooltip={false}
            name={conversation.name || conversation._id.toString()}
            size={7}
            border={false}
          />
        ) : (
          <Image
            src={conversation.iconUrl || DEFAULT_ICON_URL}
            alt={conversation.name || conversation._id.toString()}
            width={28}
            height={28}
            className="rounded-sm"
          />
        )}

        <div className="flex flex-col gap-1">
          <h2 className="font-medium">{conversation.name}</h2>
        </div>

        {hover && (
          <Button
            className="ml-auto hover:bg-muted-foreground/10 size-6"
            size="icon"
            variant={'ghost'}
            disabled={isHiding}
            onClick={() =>
              hideConversation({ conversationId: conversation._id })
            }
          >
            <IconX />
          </Button>
        )}
      </Link>
    );
  },
);

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
