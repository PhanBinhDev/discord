import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { STOP_TYPING_DEBOUNCE, TYPING_THROTTLE } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ConversationType } from '@/convex/schema';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { useUploadFile } from '@/hooks/use-upload-file';
import { cn } from '@/lib/utils';
import { ApiReturn, FileWithPreview } from '@/types';
import { ChatInputSchema, getChatInputSchema } from '@/validations';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconGift,
  IconMenu3,
  IconMoodPlus,
  IconPlus,
  IconSend2,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';
import { Item, ItemMedia, ItemTitle } from '../ui/item';
import AttachementPreviewItem from './attachment-preview-item';
import SelectEmoji from './select-emoji';
import TranslateText from './translate/translate-text';
import TypingIndicator from './typing-indicator';

interface ChatInputProps {
  conversation: ApiReturn<typeof api.conversation.getConversationDetails>;
}

const ChatInput = ({ conversation }: ChatInputProps) => {
  const { dict } = useClientDictionary();
  const { openModal, closeModal } = useModal();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(getChatInputSchema()),
    defaultValues: {
      content: '',
      mentionEveryone: false,
    },
  });

  const { mutate: sendMessage, pending: isSendingMessage } = useApiMutation(
    api.conversation.sendMessage,
  );
  const { mutate: startTyping } = useApiMutation(api.conversation.startTyping);
  const { mutate: stopTyping } = useApiMutation(api.conversation.stopTyping);
  const { mutateAsync: uploadFile } = useUploadFile();

  const content = watch('content');
  const attachments = watch('attachments');
  const lastTypingRef = useRef<number>(0);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_THROTTLE) return;

    if (conversation?._id) startTyping({ conversationId: conversation._id });
    lastTypingRef.current = now;
  }, [conversation?._id, startTyping]);

  const handleStopTyping = useDebounceCallback(() => {
    if (conversation?._id) {
      stopTyping({ conversationId: conversation._id });
      lastTypingRef.current = 0;
    }
  }, STOP_TYPING_DEBOUNCE);

  useEffect(() => {
    if (content && content.trim()) {
      handleTyping();
    } else if (!content || !content.trim()) {
      handleStopTyping();
    }
  }, [content, handleTyping, handleStopTyping]);

  const onSubmit = async (data: ChatInputSchema) => {
    const attachmentsInput = data.attachments || [];
    const filesToUpload = attachmentsInput.filter(
      att => att.file instanceof File,
    );
    const uploadResults =
      filesToUpload.length > 0 ? await uploadFile(filesToUpload) : [];
    let uploadIndex = 0;

    const uploadedFiles = attachmentsInput.length
      ? attachmentsInput.map(att => {
          const res = uploadResults[uploadIndex++];
          return {
            storageId: res.storageId,
            url: res.url || '',
            name: att.file.name,
            size: att.file.size,
            type: att.file.type,
          };
        })
      : undefined;

    const trimmedContent = (data.content || '').trim();
    const messageType =
      trimmedContent.length > 0
        ? 'text'
        : uploadedFiles?.length
          ? 'file'
          : 'text';
    sendMessage({
      conversationId: conversation?._id,
      content: data.content || '',
      attachments: uploadedFiles,
      receiverId:
        conversation?.type === 'direct'
          ? conversation?.members?.find(
              m => m._id !== conversation?.userMembership.userId,
            )?._id
          : undefined,
      type: messageType,
    });

    if (conversation?._id) {
      stopTyping({ conversationId: conversation._id });
    }

    reset();
  };

  const handleFileSelect = (files: FileWithPreview[]) => {
    setValue('attachments', [...(attachments || []), ...files]);
    closeModal('ModalUploadFile');
  };

  const handleRemoveAttachment = (index: number) => {
    const updatedAttachments = attachments?.filter((_, i) => i !== index);
    setValue('attachments', updatedAttachments);
  };

  const disabled =
    isSendingMessage ||
    isSubmitting ||
    (!content?.trim() && !(attachments && attachments.length > 0));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-auto">
      <TypingIndicator
        conversationId={conversation?._id as Id<'conversations'>}
        conversationType={conversation?.type as ConversationType}
      />
      <div className="p-2">
        <InputGroup
          className={cn(
            'px-3 flex flex-col items-center justify-center transition-all duration-200',
            attachments && attachments?.length > 0 ? 'h-80' : 'h-[60px]',
          )}
        >
          {attachments && attachments.length > 0 && (
            <ul className="w-full py-5 px-2.5 flex overflow-x-auto gap-2 flex-1">
              {attachments.map((attachment, index) => (
                <AttachementPreviewItem
                  key={index}
                  attachment={attachment}
                  onRemove={() => handleRemoveAttachment(index)}
                />
              ))}
            </ul>
          )}
          <div className="w-full flex items-center mt-auto mb-[11px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="group hover:bg-muted-foreground/10"
                  variant={'ghost'}
                  size="icon"
                >
                  <IconPlus className="size-5.5 text-muted-foreground group-hover:text-(--accent-color)" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={10}
                className="p-2 w-[190px]"
              >
                <div className="space-y-1">
                  <Item
                    className="p-2 gap-1 cursor-pointer hover:bg-muted-foreground/10 hover:text-foreground"
                    onClick={() => {
                      openModal('ModalUploadFile', {
                        callback: handleFileSelect,
                      });
                    }}
                  >
                    <ItemMedia>
                      <IconUpload className="size-4" />
                    </ItemMedia>
                    <ItemTitle>
                      <TranslateText value="servers.directMessage.conversation.input.uploadFile" />
                    </ItemTitle>
                  </Item>
                  <Item className="p-2 gap-1 cursor-pointer hover:bg-muted-foreground/10 hover:text-foreground">
                    <ItemMedia>
                      <IconMenu3 className="size-4" />
                    </ItemMedia>
                    <ItemTitle>
                      <TranslateText value="servers.directMessage.conversation.input.createPoll" />
                    </ItemTitle>
                  </Item>
                </div>
              </PopoverContent>
            </Popover>
            <InputGroupInput
              {...register('content')}
              placeholder={dict?.servers.directMessage.conversation.input.placeholder.replace(
                '{{conversationName}}',
                conversation?.name?.toString() || '',
              )}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
                }
              }}
            />
            {errors.content && (
              <p className="text-xs text-destructive absolute -bottom-5 left-0">
                {errors.content.message}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <Button
                className="group hover:bg-muted-foreground/10"
                variant={'ghost'}
                size="icon"
                type="button"
              >
                <IconGift />
              </Button>
              <SelectEmoji
                onSelect={emoji => {
                  if (emoji.native) {
                    setValue('content', (content || '') + emoji.native);
                  }
                }}
              >
                <Button
                  className="group hover:bg-muted-foreground/10"
                  variant={'ghost'}
                  size="icon"
                  type="button"
                >
                  <IconMoodPlus />
                </Button>
              </SelectEmoji>
              <Button
                size="icon"
                type="submit"
                disabled={disabled}
                loading={isSubmitting || isSendingMessage}
              >
                {!(isSubmitting || isSendingMessage) && <IconSend2 />}
              </Button>
            </div>
          </div>
        </InputGroup>
      </div>
    </form>
  );
};

export default ChatInput;
