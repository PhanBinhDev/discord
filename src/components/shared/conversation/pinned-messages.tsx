import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { IconPinFilled } from '@tabler/icons-react';

const PinnedMessages = () => {
  const { dict } = useClientDictionary();

  return (
    <Popover>
      <Hint
        side="bottom"
        sideOffset={2}
        label={
          dict?.servers.directMessage.conversation.header.hints.pinnedMessages
        }
        asChild
      >
        <PopoverTrigger asChild>
          <Button
            className="hover:bg-muted-foreground/10 text-muted-foreground"
            variant={'ghost'}
            size="icon"
          >
            <IconPinFilled className="size-5" />
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" className="p-0">
        <div className="py-2 px-3 border-b flex items-center justify-start gap-3">
          <IconPinFilled className="size-6" />
          <h3 className="font-medium">
            <TranslateText value="servers.directMessage.conversation.header.pinned.title" />
          </h3>
        </div>
        <div className="p-3"></div>
      </PopoverContent>
    </Popover>
  );
};

export default PinnedMessages;
