'use client';

import ChatInput from '@/components/shared/chat-input';
import ConversationHeader from '@/components/shared/conversation/header';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ConversationType } from '@/convex/schema';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import ChatMessages from '../../_components/chat-messages';

interface ConversationPageProps {
  params: Promise<{
    conversationId: Id<'conversations'>;
  }>;
}

const ConversationPage = (props: ConversationPageProps) => {
  const router = useRouter();
  const { conversationId } = use(props.params);

  const { data: conversationDetails, isLoading: isLoadingConversationDetails } =
    useQuery({
      ...convexQuery(api.conversation.getConversationDetails, {
        conversationId,
      }),
    });

  if (
    !conversationId ||
    (!conversationDetails && !isLoadingConversationDetails)
  ) {
    router.push('/');
    return null;
  }

  if (isLoadingConversationDetails) {
    // TODO: handle skeleton
    return <div>Loading</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-36px)]">
      <ConversationHeader
        type={conversationDetails?.type as ConversationType}
        conversation={conversationDetails!}
      />
      <ChatMessages conversation={conversationDetails!} />
      <ChatInput conversation={conversationDetails!} />
    </div>
  );
};

export default ConversationPage;
