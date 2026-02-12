import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { cn } from '@/lib/utils';
import { IconPhoneCall, IconVideoFilled } from '@tabler/icons-react';

const CallsAction = () => {
  const { dict } = useClientDictionary();

  return (
    <>
      <Hint
        side="bottom"
        sideOffset={2}
        label={
          dict?.servers.directMessage.conversation.header.hints.startCallVoice
        }
        asChild
      >
        <Button
          className={cn(
            'ml-auto hover:bg-muted-foreground/10 text-muted-foreground',
          )}
          variant={'ghost'}
          size="icon"
        >
          <IconPhoneCall className="size-5" />
        </Button>
      </Hint>
      <Hint
        side="bottom"
        sideOffset={2}
        label={
          dict?.servers.directMessage.conversation.header.hints.startCallVideo
        }
        asChild
      >
        <Button
          className={cn('hover:bg-muted-foreground/10 text-muted-foreground')}
          variant={'ghost'}
          size="icon"
        >
          <IconVideoFilled className="size-5" />
        </Button>
      </Hint>
    </>
  );
};

export default CallsAction;
