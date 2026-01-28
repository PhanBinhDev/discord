import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

// Event Types
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
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error('Unauthorized');

    const messageId = await ctx.db.insert('messages', {
      channelId: args.channelId,
      userId: userId.subject as Id<'users'>,
      content: args.content,
      type: 'text',
      mentionEveryone: false,
      isPinned: false,
    });
    await ctx.db.insert('eventLogs', {
      eventType: 'message.created',
      userId: userId.subject as Id<'users'>,
      channelId: args.channelId,
      metadata: { messageId },
      timestamp: Date.now(),
    });
    return messageId;
  },
});

// Real-time Query - Auto updates on changes
export const getMessages = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    // Client tự động nhận updates khi có message mới
    return await ctx.db
      .query('messages')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .order('desc')
      .take(100);
  },
});
