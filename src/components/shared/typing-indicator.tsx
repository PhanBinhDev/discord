'use client';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ConversationType } from '@/convex/schema';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

interface TypingIndicatorProps {
  conversationId: Id<'conversations'>;
  conversationType: ConversationType;
}

const TypingIndicator = ({
  conversationId,
  conversationType,
}: TypingIndicatorProps) => {
  const { dict } = useClientDictionary();

  const usersTyping = useQuery(api.conversation.getTypingIndicators, {
    conversationId,
  });

  const typingText = useMemo(() => {
    if (!usersTyping || usersTyping.length === 0 || !dict) return null;

    const count = usersTyping.length;
    const typing = dict.servers?.directMessage?.conversation?.input?.typing;

    if (!typing) return null;

    if (conversationType === 'direct') {
      const user = usersTyping[0];
      const displayName = user.displayName || user.username;
      return `${displayName} ${typing.isTyping}`;
    }

    if (count === 1) {
      const user = usersTyping[0];
      const displayName = user.displayName || user.username;
      return `${displayName} ${typing.isTyping}`;
    }

    if (count === 2) {
      const names = usersTyping.map(u => u.displayName || u.username);
      return `${names.join(` ${typing.and} `)} ${typing.areTyping}`;
    }

    if (count === 3 || count === 4) {
      const names = usersTyping.map(u => u.displayName || u.username);
      const lastIndex = names.length - 1;
      const allButLast = names.slice(0, lastIndex).join(', ');
      return `${allButLast}, ${typing.and} ${names[lastIndex]} ${typing.areTyping}`;
    }

    return typing.several;
  }, [usersTyping, conversationType, dict]);

  if (!typingText) return null;

  return (
    <div className="px-4 pt-2 text-xs text-muted-foreground italic flex items-center gap-2">
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
          •
        </span>
      </span>
      <span>{typingText}</span>
    </div>
  );
};

export default TypingIndicator;
