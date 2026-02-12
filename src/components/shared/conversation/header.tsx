import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { api } from '@/convex/_generated/api';
import { ConversationType } from '@/convex/schema';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useToggleSideConversation } from '@/hooks/use-toggle-side-conversation';
import { cn } from '@/lib/utils';
import { ApiReturn } from '@/types';
import {
  IconSearch,
  IconUserCircle,
  IconUsers,
  IconUsersPlus,
} from '@tabler/icons-react';
import CallsAction from './calls-action';
import PinnedMessages from './pinned-messages';

interface ConversationHeaderProps {
  type: ConversationType;
  conversation: ApiReturn<typeof api.conversation.getConversationDetails>;
}

const ConversationHeader = ({
  type,
  conversation,
}: ConversationHeaderProps) => {
  const { dict } = useClientDictionary();
  const { type: toggleType, toggle } = useToggleSideConversation();

  return (
    <div className="flex items-center p-2 pl-4 border-b gap-2">
      <CallsAction />
      <PinnedMessages />
      <Hint
        side="bottom"
        sideOffset={2}
        label={dict?.servers.directMessage.conversation.header.hints.addFriend}
        asChild
      >
        <Button
          className={cn('hover:bg-muted-foreground/10 text-muted-foreground')}
          variant={'ghost'}
          size="icon"
        >
          <IconUsersPlus className="size-5" />
        </Button>
      </Hint>
      {type === 'direct' ? (
        <Hint
          side="bottom"
          sideOffset={2}
          label={
            toggleType.direct
              ? dict?.servers.directMessage.conversation.header.hints
                  .hiddenUserProfile
              : dict?.servers.directMessage.conversation.header.hints
                  .showUserProfile
          }
          asChild
        >
          <Button
            onClick={() => toggle('direct')}
            className={cn(
              'hover:bg-muted-foreground/10 text-muted-foreground',
              toggleType.direct && 'text-white',
            )}
            variant={'ghost'}
            size="icon"
          >
            <IconUserCircle className="size-5" />
          </Button>
        </Hint>
      ) : (
        <Hint
          side="bottom"
          sideOffset={2}
          label={
            toggleType.group
              ? dict?.servers.directMessage.conversation.header.hints
                  .hiddenMembersList
              : dict?.servers.directMessage.conversation.header.hints
                  .showMembersList
          }
          asChild
        >
          <Button
            onClick={() => toggle('group')}
            className={cn(
              'hover:bg-muted-foreground/10 text-muted-foreground',
              toggleType.group && 'text-white',
            )}
            variant={'ghost'}
            size="icon"
          >
            <IconUsers className="size-5" />
          </Button>
        </Hint>
      )}
      <InputGroup className="max-w-[250px]">
        <InputGroupInput
          placeholder={dict?.servers.directMessage.conversation.header.placeholder.replace(
            '{{conversationName}}',
            conversation?.name || 'conversation',
          )}
        />
        <InputGroupAddon align={'inline-end'}>
          <IconSearch className="size-4" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};

export default ConversationHeader;
