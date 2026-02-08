import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getCurrentUserOrThrow } from './users';

export const eventTypes = [
  'message.created',
  'message.updated',
  'message.deleted',
  'user.status.changed',
  'user.typing',
  'channel.created',
  'member.joined',
  'voice.joined',
  'reaction.added',
] as const;

// Real-time Message Example
export const sendMessage = mutation({
  args: {
    channelId: v.id('channels'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const messageId = await ctx.db.insert('messages', {
      channelId: args.channelId,
      userId: user._id,
      content: args.content,
      type: 'text',
      mentionEveryone: false,
      isPinned: false,
    });
    await ctx.db.insert('eventLogs', {
      eventType: 'message.created',
      userId: user._id,
      channelId: args.channelId,
      metadata: { messageId },
      timestamp: Date.now(),
    });
    return messageId;
  },
});

export const getMessages = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .order('desc')
      .take(100);
  },
});
