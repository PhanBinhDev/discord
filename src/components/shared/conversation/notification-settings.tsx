import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Hint } from '@/components/ui/hint';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { IconBellFilled } from '@tabler/icons-react';

const NotificationSettings = () => {
  const { dict } = useClientDictionary();

  return (
    <DropdownMenu>
      <Hint
        side="bottom"
        sideOffset={2}
        label={
          dict?.servers.directMessage.conversation.header.hints
            .notificationSettings
        }
        asChild
      >
        <DropdownMenuTrigger asChild>
          <Button
            className="ml-auto hover:bg-muted-foreground/10 text-muted-foreground"
            variant={'ghost'}
            size="icon"
          >
            <IconBellFilled className="size-5" />
          </Button>
        </DropdownMenuTrigger>
      </Hint>
      <DropdownMenuContent align="end" className="p-0">
        hello
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationSettings;
