import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import '@/styles/custom.css';
import { EmojiMartEmoji } from '@/types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { IconMoodHappy } from '@tabler/icons-react';
import { memo, ReactNode, useState } from 'react';

interface SelectEmojiProps {
  onSelect: (emoji: EmojiMartEmoji) => void;
  emojiSize?: number;
  emojiButtonSize?: number;
  disabled?: boolean;
  children?: ReactNode;
}

const SelectEmoji = memo(
  ({
    onSelect,
    emojiSize = 32,
    emojiButtonSize = 36,
    disabled = false,
    children,
  }: SelectEmojiProps) => {
    const { locale } = useClientDictionary();
    const [open, setOpen] = useState(false);

    const handleEmojiSelect = (emoji: EmojiMartEmoji) => {
      onSelect(emoji);
      setOpen(false);
    };

    const defaultTrigger = (
      <Button
        size="icon-sm"
        variant="ghost"
        className="hover:bg-accent/50 transition-colors"
        onClick={e => {
          e.stopPropagation();
        }}
        disabled={disabled}
      >
        <IconMoodHappy className="text-var(--accent-color) w-5 h-5" />
      </Button>
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children || defaultTrigger}</PopoverTrigger>
        <PopoverContent
          className="w-[320px] sm:w-[352px] p-0 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          align="end"
          sideOffset={8}
        >
          <div
            className="overflow-auto discord-emoji-picker"
            onWheel={e => e.stopPropagation()}
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              locale={locale}
              emojiSize={emojiSize}
              emojiButtonSize={emojiButtonSize}
              previewPosition="none"
              maxFrequentRows={1}
              navPosition="top"
              icons="auto"
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

SelectEmoji.displayName = 'SelectEmoji';

export default SelectEmoji;
