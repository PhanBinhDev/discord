'use client';

import SelectEmoji from '@/components/shared/select-emoji';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { cn } from '@/lib/utils';
import {
  IconBold,
  IconEye,
  IconEyeClosed,
  IconItalic,
  IconPencil,
  IconStrikethrough,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Hint } from '../ui/hint';

interface TopicEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function TopicEditor({
  value,
  onChange,
  placeholder,
  maxLength = 990,
  className,
}: TopicEditorProps) {
  const { dict } = useClientDictionary();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderPreview = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(
        /\|\|(.+?)\|\|/g,
        '<span class="spoiler bg-foreground/90 text-transparent hover:bg-transparent hover:text-foreground transition-colors cursor-pointer rounded px-0.5">$1</span>',
      );
  };

  return (
    <div className={cn(className)}>
      <div className="bg-secondary/50 rounded-t-md border border-b-0 border-input">
        <div className="flex items-center justify-between p-2 gap-2">
          <div className="flex items-center gap-1">
            <Hint
              label={dict?.servers.channel.edit.general.topicEditor.bold}
              sideOffset={2}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10"
                onClick={() => insertMarkdown('**')}
                title={dict?.servers.channel.edit.general.topicEditor.bold}
                disabled={showPreview}
              >
                <IconBold className="h-4 w-4" />
              </Button>
            </Hint>
            <Hint
              label={dict?.servers.channel.edit.general.topicEditor.italic}
              sideOffset={2}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10"
                onClick={() => insertMarkdown('*')}
                title={dict?.servers.channel.edit.general.topicEditor.italic}
                disabled={showPreview}
              >
                <IconItalic className="h-4 w-4" />
              </Button>
            </Hint>
            <Hint
              label={
                dict?.servers.channel.edit.general.topicEditor.strikethrough
              }
              sideOffset={2}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10"
                onClick={() => insertMarkdown('~~')}
                title={
                  dict?.servers.channel.edit.general.topicEditor.strikethrough
                }
                disabled={showPreview}
              >
                <IconStrikethrough className="h-4 w-4" />
              </Button>
            </Hint>
            <Hint
              label={dict?.servers.channel.edit.general.topicEditor.spoiler}
              sideOffset={2}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10"
                onClick={() => insertMarkdown('||')}
                title={dict?.servers.channel.edit.general.topicEditor.spoiler}
                disabled={showPreview}
              >
                <IconEyeClosed className="h-4 w-4" />
              </Button>
            </Hint>
            <div className="h-4 w-px bg-border mx-1" />
            <Hint
              label={
                showPreview
                  ? dict?.servers.channel.edit.general.topicEditor.edit
                  : dict?.servers.channel.edit.general.topicEditor.preview
              }
              sideOffset={2}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10"
                onClick={() => setShowPreview(!showPreview)}
                title={
                  showPreview
                    ? dict?.servers.channel.edit.general.topicEditor.edit
                    : dict?.servers.channel.edit.general.topicEditor.preview
                }
              >
                {showPreview ? (
                  <IconPencil className="h-4 w-4" />
                ) : (
                  <IconEye className="h-4 w-4" />
                )}
              </Button>
            </Hint>
          </div>
          <SelectEmoji
            disabled={showPreview}
            onSelect={emoji => {
              const textarea = textareaRef.current;
              if (!textarea) return;

              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const beforeText = value.substring(0, start);
              const afterText = value.substring(end);

              const newText = `${beforeText}${emoji.native}${afterText}`;
              onChange(newText);

              setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + (emoji.native?.length ?? 0);
                textarea.setSelectionRange(newCursorPos, newCursorPos);
              }, 0);
            }}
          />
        </div>
      </div>

      {showPreview ? (
        <div className="min-h-[100px] p-3 border border-input rounded-b-md bg-muted/10">
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="rounded-t-none min-h-[100px] resize-none"
        />
      )}

      <div className="flex justify-end text-xs text-muted-foreground">
        <span>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
