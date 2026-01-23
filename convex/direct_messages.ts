import { getAuthUserId } from '@convex-dev/auth/server';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

async function canSendDM(
  ctx: GenericMutationCtx<DataModel>,
  senderId: Id<'users'>,
  receiverId: Id<'users'>,
): Promise<{ canSend: boolean; reason?: string }> {
  // Get receiver's settings
  const receiverSettings = await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', receiverId))
    .first();

  const dmPermission =
    receiverSettings?.privacy?.dmPermission || 'server_members';

  // If receiver allows everyone
  if (dmPermission === 'everyone') {
    return { canSend: true };
  }

  // If receiver doesn't allow anyone
  if (dmPermission === 'none') {
    return { canSend: false, reason: 'User is not accepting direct messages' };
  }

  // Check if blocked
  const blocked = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', receiverId).eq('userId2', senderId),
    )
    .first();

  if (blocked?.status === 'blocked') {
    return { canSend: false, reason: 'You are blocked by this user' };
  }

  const reverseBlocked = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', senderId).eq('userId2', receiverId),
    )
    .first();

  if (reverseBlocked?.status === 'blocked') {
    return { canSend: false, reason: 'You have blocked this user' };
  }

  // Check if friends
  const friendship1 = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', senderId).eq('userId2', receiverId),
    )
    .first();

  const friendship2 = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', receiverId).eq('userId2', senderId),
    )
    .first();

  const areFriends =
    friendship1?.status === 'accepted' || friendship2?.status === 'accepted';

  if (dmPermission === 'friends') {
    if (areFriends) {
      return { canSend: true };
    }
    return { canSend: false, reason: 'You must be friends to send a message' };
  }

  // dmPermission === 'server_members'
  // Check if they share a server
  const senderMemberships = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', senderId))
    .filter(q => q.eq(q.field('isBanned'), false))
    .collect();

  const receiverMemberships = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', receiverId))
    .filter(q => q.eq(q.field('isBanned'), false))
    .collect();

  const senderServerIds = new Set(senderMemberships.map(m => m.serverId));
  const sharedServer = receiverMemberships.some(m =>
    senderServerIds.has(m.serverId),
  );

  if (sharedServer || areFriends) {
    return { canSend: true };
  }

  return {
    canSend: false,
    reason: 'You must share a server or be friends to send a message',
  };
}

async function canSendDMQuery(
  ctx: GenericQueryCtx<DataModel>,
  senderId: Id<'users'>,
  receiverId: Id<'users'>,
): Promise<{ canSend: boolean; reason?: string }> {
  // Get receiver's settings
  const receiverSettings = await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', receiverId))
    .first();

  const dmPermission =
    receiverSettings?.privacy?.dmPermission || 'server_members';

  // If receiver allows everyone
  if (dmPermission === 'everyone') {
    return { canSend: true };
  }

  // If receiver doesn't allow anyone
  if (dmPermission === 'none') {
    return { canSend: false, reason: 'User is not accepting direct messages' };
  }

  // Check if blocked
  const blocked = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', receiverId).eq('userId2', senderId),
    )
    .first();

  if (blocked?.status === 'blocked') {
    return { canSend: false, reason: 'You are blocked by this user' };
  }

  const reverseBlocked = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', senderId).eq('userId2', receiverId),
    )
    .first();

  if (reverseBlocked?.status === 'blocked') {
    return { canSend: false, reason: 'You have blocked this user' };
  }

  // Check if friends
  const friendship1 = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', senderId).eq('userId2', receiverId),
    )
    .first();

  const friendship2 = await ctx.db
    .query('friends')
    .withIndex('by_users', q =>
      q.eq('userId1', receiverId).eq('userId2', senderId),
    )
    .first();

  const areFriends =
    friendship1?.status === 'accepted' || friendship2?.status === 'accepted';

  if (dmPermission === 'friends') {
    if (areFriends) {
      return { canSend: true };
    }
    return { canSend: false, reason: 'You must be friends to send a message' };
  }

  // dmPermission === 'server_members'
  // Check if they share a server
  const senderMemberships = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', senderId))
    .filter(q => q.eq(q.field('isBanned'), false))
    .collect();

  const receiverMemberships = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', receiverId))
    .filter(q => q.eq(q.field('isBanned'), false))
    .collect();

  const senderServerIds = new Set(senderMemberships.map(m => m.serverId));
  const sharedServer = receiverMemberships.some(m =>
    senderServerIds.has(m.serverId),
  );

  if (sharedServer || areFriends) {
    return { canSend: true };
  }

  return {
    canSend: false,
    reason: 'You must share a server or be friends to send a message',
  };
}

// Send a direct message
export const sendDirectMessage = mutation({
  args: {
    receiverId: v.id('users'),
    content: v.string(),
    type: v.optional(
      v.union(
        v.literal('text'),
        v.literal('image'),
        v.literal('video'),
        v.literal('audio'),
        v.literal('file'),
      ),
    ),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          storageId: v.optional(v.id('_storage')),
          size: v.number(),
          type: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const receiver = await ctx.db.get(args.receiverId);
    if (!receiver) throw new Error('Receiver not found');

    if (user._id === args.receiverId) {
      throw new Error('Cannot send message to yourself');
    }

    // Check permissions
    const permissionCheck = await canSendDM(ctx, user._id, args.receiverId);
    if (!permissionCheck.canSend) {
      throw new Error(permissionCheck.reason || 'Cannot send message');
    }

    // Create message
    const messageId = await ctx.db.insert('directMessages', {
      senderId: user._id,
      receiverId: args.receiverId,
      content: args.content,
      type: args.type || 'text',
      attachments: args.attachments,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true, messageId };
  },
});

// Get conversation with a specific user
export const getConversation = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', authUserId))
      .first();

    if (!user) return [];

    const limit = args.limit || 50;

    // Get messages where user is sender or receiver
    const messages1 = await ctx.db
      .query('directMessages')
      .withIndex('by_conversation', q =>
        q.eq('senderId', user._id).eq('receiverId', args.userId),
      )
      .filter(q =>
        args.before
          ? q.lt(q.field('createdAt'), args.before)
          : q.gt(q.field('createdAt'), 0),
      )
      .order('desc')
      .take(limit);

    const messages2 = await ctx.db
      .query('directMessages')
      .withIndex('by_conversation', q =>
        q.eq('senderId', args.userId).eq('receiverId', user._id),
      )
      .filter(q =>
        args.before
          ? q.lt(q.field('createdAt'), args.before)
          : q.gt(q.field('createdAt'), 0),
      )
      .order('desc')
      .take(limit);

    // Combine and sort by timestamp
    const allMessages = [...messages1, ...messages2]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Get sender details for each message
    const messagesWithSenders = await Promise.all(
      allMessages.map(async msg => {
        const sender = await ctx.db.get(msg.senderId);
        if (!sender) return null;

        return {
          ...msg,
          sender: {
            _id: sender._id,
            username: sender.username,
            displayName: sender.displayName,
            discriminator: sender.discriminator,
            avatarUrl: sender.avatarUrl,
          },
        };
      }),
    );

    return messagesWithSenders.filter(
      (msg): msg is NonNullable<typeof msg> => msg !== null,
    );
  },
});

// Get all conversations (list of users with recent messages)
export const getConversations = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return [];

    // Get all messages where user is involved
    const sentMessages = await ctx.db
      .query('directMessages')
      .withIndex('by_sender', q => q.eq('senderId', user._id))
      .order('desc')
      .collect();

    const receivedMessages = await ctx.db
      .query('directMessages')
      .withIndex('by_receiver', q => q.eq('receiverId', user._id))
      .order('desc')
      .collect();

    // Get unique users and their last message
    const conversationMap = new Map<
      string,
      {
        userId: Id<'users'>;
        lastMessage: Doc<'directMessages'>;
        unreadCount: number;
      }
    >();

    for (const msg of [...sentMessages, ...receivedMessages]) {
      const otherUserId =
        msg.senderId === user._id ? msg.receiverId : msg.senderId;
      const existing = conversationMap.get(otherUserId);

      if (!existing || msg.createdAt > existing.lastMessage.createdAt) {
        const unreadCount =
          msg.receiverId === user._id && !msg.isRead
            ? (existing?.unreadCount || 0) + 1
            : existing?.unreadCount || 0;

        conversationMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg,
          unreadCount,
        });
      }
    }

    // Get user details and format conversations
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async conv => {
        const otherUser = await ctx.db.get(conv.userId);
        if (!otherUser) return null;

        const lastMessageSender = await ctx.db.get(conv.lastMessage.senderId);

        return {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            displayName: otherUser.displayName,
            discriminator: otherUser.discriminator,
            avatarUrl: otherUser.avatarUrl,
            status: otherUser.status,
          },
          lastMessage: {
            content: conv.lastMessage.content,
            type: conv.lastMessage.type,
            createdAt: conv.lastMessage.createdAt,
            senderId: conv.lastMessage.senderId,
            senderName:
              lastMessageSender?.displayName || lastMessageSender?.username,
          },
          unreadCount: conv.unreadCount,
        };
      }),
    );

    // Sort by last message time
    return conversations
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null)
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', authUserId))
      .first();

    if (!user) throw new Error('User not found');

    // Get all unread messages from this user
    const unreadMessages = await ctx.db
      .query('directMessages')
      .withIndex('by_conversation', q =>
        q.eq('senderId', args.userId).eq('receiverId', user._id),
      )
      .filter(q => q.eq(q.field('isRead'), false))
      .collect();

    // Mark all as read
    await Promise.all(
      unreadMessages.map(msg =>
        ctx.db.patch(msg._id, {
          isRead: true,
          readAt: Date.now(),
        }),
      ),
    );

    return { success: true, count: unreadMessages.length };
  },
});

// Edit a direct message
export const editDirectMessage = mutation({
  args: {
    messageId: v.id('directMessages'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error('Message not found');

    // Verify user is the sender
    if (message.senderId !== user._id) {
      throw new Error('You can only edit your own messages');
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a direct message
export const deleteDirectMessage = mutation({
  args: { messageId: v.id('directMessages') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error('Message not found');

    // Verify user is the sender
    if (message.senderId !== user._id) {
      throw new Error('You can only delete your own messages');
    }

    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
      content: '[Message deleted]',
    });

    return { success: true };
  },
});

// Check if user can DM another user (query version for UI)
export const checkDMPermission = query({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canSend: false, reason: 'Unauthorized' };

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return { canSend: false, reason: 'User not found' };

    return await canSendDMQuery(ctx, user._id, args.targetUserId);
  },
});

// Get unread count
export const getUnreadCount = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return 0;

    const unreadMessages = await ctx.db
      .query('directMessages')
      .withIndex('by_receiver', q => q.eq('receiverId', user._id))
      .filter(q => q.eq(q.field('isRead'), false))
      .collect();

    return unreadMessages.length;
  },
});
