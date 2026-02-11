import {
  MAX_LENGTH_CHANNEL_NAME,
  MIN_LENGTH_CHANNEL_NAME,
  TOPIC_CHANNEL_MAX_LENGTH,
} from '@/constants/app';
import { getGlobalDict } from '@/lib/dictionary-store';
import z from 'zod';

export const getServerSchema = () => {
  const dict = getGlobalDict();

  return z.object({
    name: z
      .string()
      .nonempty(dict?.servers.nameRequired)
      .min(1, dict?.servers.nameRequired)
      .max(100, dict?.servers.nameMaxLength),
    isPublic: z.boolean().default(true),
  });
};

export const getCreateChannelSchema = () => {
  const dict = getGlobalDict();

  return z.object({
    name: z
      .string()
      .nonempty(dict?.servers.channel.channelNameRequired)
      .min(
        MIN_LENGTH_CHANNEL_NAME,
        dict?.servers.channel.channelNameRequired?.replace(
          '{{min}}',
          String(MIN_LENGTH_CHANNEL_NAME),
        ),
      )
      .max(
        MAX_LENGTH_CHANNEL_NAME,
        dict?.servers.channel.channelNameMaxLength?.replace(
          '{{max}}',
          String(MAX_LENGTH_CHANNEL_NAME),
        ),
      ),
    type: z.enum(['text', 'voice', 'announcement']),
    isPrivate: z.boolean().default(false),
  });
};

export const getCreateCategorySchema = () => {
  const dict = getGlobalDict();

  return z.object({
    name: z
      .string()
      .nonempty(dict?.servers.category.categoryNameRequired)
      .min(
        MIN_LENGTH_CHANNEL_NAME,
        dict?.servers.category.categoryNameRequired?.replace(
          '{{min}}',
          String(MIN_LENGTH_CHANNEL_NAME),
        ),
      )
      .max(
        MAX_LENGTH_CHANNEL_NAME,
        dict?.servers.category.categoryNameMaxLength?.replace(
          '{{max}}',
          String(MAX_LENGTH_CHANNEL_NAME),
        ),
      ),
    isPrivate: z.boolean().default(false),
  });
};

export const getUpdateChannelSchema = () => {
  const dict = getGlobalDict();

  return z.object({
    name: z
      .string()
      .nonempty(
        dict?.servers.channel.channelNameRequired || 'Channel name is required',
      )
      .min(
        MIN_LENGTH_CHANNEL_NAME,
        dict?.servers.channel.channelNameRequired?.replace(
          '{{min}}',
          String(MIN_LENGTH_CHANNEL_NAME),
        ),
      )
      .max(
        MAX_LENGTH_CHANNEL_NAME,
        dict?.servers.channel.channelNameMaxLength?.replace(
          '{{max}}',
          String(MAX_LENGTH_CHANNEL_NAME),
        ),
      ),
    isNsfw: z.boolean().default(false),
    topic: z
      .string()
      .max(
        TOPIC_CHANNEL_MAX_LENGTH,
        dict?.servers.channel.edit.general.topicMaxLength?.replace(
          '{{max}}',
          TOPIC_CHANNEL_MAX_LENGTH.toString(),
        ),
      ),
    slowMode: z.number().min(0).max(21600).default(0),
    isPrivate: z.boolean().default(false),
  });
};

export type CreateChannelFormValues = z.infer<
  ReturnType<typeof getCreateChannelSchema>
>;
export type ServerFormValues = z.infer<ReturnType<typeof getServerSchema>>;
export type CreateCategoryFormValues = z.infer<
  ReturnType<typeof getCreateCategorySchema>
>;
export type UpdateChannelFormValues = z.infer<
  ReturnType<typeof getUpdateChannelSchema>
>;
