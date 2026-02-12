'use client';
import ServerCategorySkeleton from '@/components/skeletons/server-category';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import ConversationItem from './conversation-item';

const Conversations = () => {
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    ...convexQuery(api.conversation.getConversations),
  });

  const params = useParams();
  const conversationId = params?.conversationId as Id<'conversations'> | undefined;

  if (!conversations) return null;

  if (isLoadingConversations) {
    return (
      <div className="flex flex-col gap-1 py-2 flex-1 overflow-y-auto max-h-[calc(100vh-265px)]">
        <ServerCategorySkeleton lines={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2 flex-1 overflow-y-auto max-h-[calc(100vh-265px)]">
      {conversations.map(conversation => {
        return (
          <ConversationItem
            key={conversation._id.toString()}
            conversation={conversation}
            isActive={conversation._id.toString() === conversationId}
          />
        );
      })}
    </div>
  );
};

export default Conversations;
