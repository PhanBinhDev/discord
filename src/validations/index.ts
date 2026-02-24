import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS } from '@/constants/app';
import { getGlobalDict } from '@/lib/dictionary-store';
import z from 'zod';

export const getChatInputSchema = () => {
  const dict = getGlobalDict();

  return z
    .object({
      content: z
        .string()
        .default('')
        .refine(
          val => val.trim().length > 0,
          dict?.servers.directMessage.conversation.input.messageRequired,
        )
        .optional()
        .catch(''),
      attachments: z
        .array(
          z.object({
            file: z.instanceof(File),
            id: z.string(),
            preview: z.string().optional(),
          }),
        )
        .refine(files => files.every(f => f.file.size <= MAX_ATTACHMENT_SIZE), {
          message:
            dict?.servers.directMessage.conversation.input.attachmentTooLarge.replace(
              '{{max}}',
              (MAX_ATTACHMENT_SIZE / (1024 * 1024)).toFixed(2),
            ),
        })
        .max(
          MAX_ATTACHMENTS,
          dict?.servers.directMessage.conversation.input.tooManyAttachments.replace(
            '{{max}}',
            MAX_ATTACHMENTS.toString(),
          ),
        )
        .optional(),
      replyToId: z.string().optional(),
      mentions: z.array(z.string()).optional(),
      mentionEveryone: z.boolean().optional().default(false),
    })
    .refine(
      data =>
        (data.content?.trim().length ?? 0) > 0 ||
        (data.attachments?.length ?? 0) > 0,
      {
        message:
          dict?.servers.directMessage.conversation.input.messageOrAttachment,
        path: ['content'],
      },
    );
};

export type ChatInputSchema = z.infer<ReturnType<typeof getChatInputSchema>>;
