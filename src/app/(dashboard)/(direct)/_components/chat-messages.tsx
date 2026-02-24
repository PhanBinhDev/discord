import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_MESSAGES_LIMIT } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ApiReturn } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';

interface ChatMessagesProps {
  conversation: ApiReturn<typeof api.conversation.getConversationDetails>;
}

const ChatMessages = ({ conversation }: ChatMessagesProps) => {
  const { data: messages } = useQuery({
    ...convexQuery(api.conversation.getMessages, {
      conversationId: conversation?._id as Id<'conversations'>,
      limit: DEFAULT_MESSAGES_LIMIT,
    }),
    enabled: !!conversation?._id,
  });

  return <ScrollArea className="flex-1">hello</ScrollArea>;
};

export default ChatMessages;
