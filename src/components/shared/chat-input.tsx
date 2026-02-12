import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { IconGift, IconHomeMove, IconPlus } from '@tabler/icons-react';
import { Button } from '../ui/button';

const ChatInput = () => {
  return (
    <div className="p-2 mt-auto">
      <InputGroup className="h-[60px] px-3">
        <Button
          className="group hover:bg-muted-foreground/10"
          variant={'ghost'}
          size="icon"
        >
          <IconPlus className="size-5.5 text-muted-foreground group-hover:text-(--accent-color)" />
        </Button>
        <InputGroupInput />
        <div className="flex items-center gap-1.5">
          <Button
            className="group hover:bg-muted-foreground/10"
            variant={'ghost'}
            size="icon"
          >
            <IconGift />
          </Button>
          <Button
            className="group hover:bg-muted-foreground/10"
            variant={'ghost'}
            size="icon"
          >
            <IconHomeMove />
          </Button>
        </div>
      </InputGroup>
    </div>
  );
};

export default ChatInput;
