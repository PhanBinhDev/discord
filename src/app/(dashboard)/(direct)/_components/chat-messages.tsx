import TranslateText from '@/components/shared/translate/translate-text';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_MESSAGES_LIMIT } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useConvexInfiniteQuery } from '@/hooks/use-infinite-query';
import { useInfiniteScrollObserver } from '@/hooks/use-infinite-scroll-observer';
import { ApiReturn } from '@/types';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import ChatItem from './chat-item';
import { ChatWelcome } from './chat-welcome';

interface ChatMessagesProps {
  conversation: ApiReturn<typeof api.conversation.getConversationDetails>;
}

const ChatMessages = ({ conversation }: ChatMessagesProps) => {
  const { results, status, loadMore, hasNextPage, isFetchingNextPage } =
    useConvexInfiniteQuery(
      api.conversation.getMessages,
      {
        conversationId: conversation?._id as Id<'conversations'>,
      },
      {
        initialNumItems: DEFAULT_MESSAGES_LIMIT,
      },
    );
  const { sentinelRef } = useInfiniteScrollObserver({
    loadMore: () => {
      if (status === 'CanLoadMore') {
        loadMore();
      }
    },
    status,
  });

  console.log('results', results);

  const grouped = useMemo(() => {}, [results]);

  return (
    <ScrollArea className="flex-1 max-h-[calc(100vh-60px-36px-53px-16px)]">
      {!hasNextPage && <div className="flex-1" />}
      {!hasNextPage && (
        <ChatWelcome
          name={conversation?.name || 'Unknown'}
          type={'conversation'}
        />
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
          ) : (
            <button
              onClick={() => loadMore()}
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
            >
              <TranslateText value="servers.directMessage.conversation.chat.loadPreviousMessages" />
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 px-4">
        {results.map(message => (
          <ChatItem key={message._id.toString()} message={message} />
        ))}
      </div>
      <div ref={sentinelRef} />
    </ScrollArea>
  );
};

export default ChatMessages;
