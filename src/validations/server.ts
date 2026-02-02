import {
  MAX_LENGTH_CHANNEL_NAME,
  MIN_LENGTH_CHANNEL_NAME,
} from '@/constants/app';
import { getGlobalDict } from '@/lib/dictionary-store';
import z from 'zod';

const dict = getGlobalDict();

console.log(
  'dict in validations/server.ts:',
  dict?.servers.channel.channelNameRequired.replace(
    '{{min}}',
    String(MIN_LENGTH_CHANNEL_NAME),
  ),
);

export const serverSchema = z.object({
  name: z
    .string()
    .nonempty(dict?.servers.nameRequired)
    .min(1, dict?.servers.nameRequired)
    .max(100, dict?.servers.nameMaxLength),
  isPublic: z.boolean().default(true),
});

export const createChannelSchema = z.object({
  name: z
    .string()
    .nonempty(dict?.servers.channel.channelNameRequired)
    .min(
      MIN_LENGTH_CHANNEL_NAME,
      dict?.servers.channel.channelNameRequired.replace(
        '{{min}}',
        String(MIN_LENGTH_CHANNEL_NAME),
      ),
    )
    .max(
      MAX_LENGTH_CHANNEL_NAME,
      dict?.servers.channel.channelNameMaxLength.replace(
        '{{max}}',
        String(MAX_LENGTH_CHANNEL_NAME),
      ),
    ),
  type: z.enum(['text', 'voice', 'announcement']),
  isPrivate: z.boolean().default(false),
});

export type CreateChannelFormValues = z.infer<typeof createChannelSchema>;
export type ServerFormValues = z.infer<typeof serverSchema>;
