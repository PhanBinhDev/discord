import {
  GenericMutationCtx,
  GenericQueryCtx,
  paginationOptsValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { getCurrentUserOrThrow } from './users';

/**
 * Check if user can send DM to another user
 */
async function canSendDM(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>,
  senderId: Id<'users'>,
  receiverId: Id<'users'>,
): Promise<{ canSend: boolean; reason?: string }> {
  const receiverSettings = await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', receiverId))
    .first();

  const dmPermission =
    receiverSettings?.privacy?.dmPermission || 'server_members';

  if (dmPermission === 'everyone') {
    return { canSend: true };
  }

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

/**
 * Get or create a direct conversation between two users
 */
async function getOrCreateDirectConversation(
  ctx: GenericMutationCtx<DataModel>,
  user1Id: Id<'users'>,
  user2Id: Id<'users'>,
): Promise<Id<'conversations'>> {
  const user1Conversations = await ctx.db
    .query('conversationMembers')
    .withIndex('by_user', q => q.eq('userId', user1Id))
    .collect();

  const user2Conversations = await ctx.db
    .query('conversationMembers')
    .withIndex('by_user', q => q.eq('userId', user2Id))
    .collect();

  const user1ConvIds = new Set(user1Conversations.map(c => c.conversationId));
  const sharedConvMember = user2Conversations.find(c =>
    user1ConvIds.has(c.conversationId),
  );

  if (sharedConvMember) {
    const conversation = await ctx.db.get(sharedConvMember.conversationId);
    if (conversation?.type === 'direct' && conversation.isActive) {
      return conversation._id;
    }
  }

  // Create new conversation
  const conversationId = await ctx.db.insert('conversations', {
    type: 'direct',
    isActive: true,
    createdBy: user1Id,
    lastMessageAt: Date.now(),
  });

  // Add both users as members
  await ctx.db.insert('conversationMembers', {
    conversationId,
    userId: user1Id,
    joinedAt: Date.now(),
    isMuted: false,
    isPinned: false,
  });

  await ctx.db.insert('conversationMembers', {
    conversationId,
    userId: user2Id,
    joinedAt: Date.now(),
    isMuted: false,
    isPinned: false,
  });

  return conversationId;
}

export const sendMessage = mutation({
  args: {
    conversationId: v.optional(v.id('conversations')),
    receiverId: v.optional(v.id('users')),
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
    replyToId: v.optional(v.id('conversationMessages')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    let conversationId = args.conversationId;

    if (!conversationId && args.receiverId) {
      if (user._id === args.receiverId) {
        throw new ConvexError('Cannot send message to yourself');
      }

      const permissionCheck = await canSendDM(ctx, user._id, args.receiverId);
      if (!permissionCheck.canSend) {
        throw new ConvexError(permissionCheck.reason || 'Cannot send message');
      }

      conversationId = await getOrCreateDirectConversation(
        ctx,
        user._id,
        args.receiverId,
      );
    }

    if (!conversationId) {
      throw new ConvexError('Conversation ID or Receiver ID required');
    }

    // Single query: verify membership + leftAt cùng lúc
    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.leftAt) {
      throw new ConvexError('You are not a member of this conversation');
    }

    // Verify conversation is active — dùng get() thay vì query để tránh scan
    const conversation = await ctx.db.get(conversationId);
    if (!conversation?.isActive) {
      throw new ConvexError('Conversation is not active');
    }

    const hasContent = args.content.trim().length > 0;
    const hasAttachments = (args.attachments?.length ?? 0) > 0;
    const resolvedType =
      args.type || (hasContent ? 'text' : hasAttachments ? 'file' : 'text');

    // Attachments sequentially
    const attachmentsWithUrls: NonNullable<typeof args.attachments> = [];
    if (args.attachments) {
      for (const att of args.attachments) {
        if (att.storageId && !att.url) {
          const url = await ctx.storage.getUrl(att.storageId);
          attachmentsWithUrls.push({ ...att, url: url ?? att.url });
        } else {
          attachmentsWithUrls.push(att);
        }
      }
    }

    // Insert message + patch conversation song song vì không conflict nhau
    const [messageId] = await Promise.all([
      ctx.db.insert('conversationMessages', {
        conversationId,
        senderId: user._id,
        content: args.content,
        type: resolvedType,
        attachments:
          attachmentsWithUrls.length > 0 ? attachmentsWithUrls : undefined,
        replyToId: args.replyToId,
      }),
      ctx.db.patch(conversationId, {
        lastMessageAt: Date.now(),
      }),
    ]);

    const hiddenMemberships = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_hidden', q =>
        q.eq('conversationId', conversationId).gt('hiddenAt', 0),
      )
      .collect();

    for (const m of hiddenMemberships) {
      await ctx.db.patch(m._id, { hiddenAt: undefined });
    }

    return { success: true, messageId, conversationId };
  },
});

/**
 * Create a group conversation
 */
export const createGroupConversation = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id('users')),
    iconUrl: v.optional(v.string()),
    iconStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (args.memberIds.length > 9) {
      throw new ConvexError('Group conversations are limited to 10 members');
    }
    const uniqueMemberIds = Array.from(
      new Set(args.memberIds.filter(id => id !== user._id)),
    );

    if (uniqueMemberIds.length === 0) {
      throw new ConvexError('At least one other member is required');
    }

    const members = await Promise.all(
      uniqueMemberIds.map(id => ctx.db.get(id)),
    );

    if (members.some(m => !m)) {
      throw new ConvexError('One or more members not found');
    }

    const conversationId = await ctx.db.insert('conversations', {
      type: 'group',
      name: args.name,
      iconUrl: args.iconUrl,
      iconStorageId: args.iconStorageId,
      ownerId: user._id,
      isActive: true,
      createdBy: user._id,
      lastMessageAt: Date.now(),
    });

    await ctx.db.insert('conversationMembers', {
      conversationId,
      userId: user._id,
      joinedAt: Date.now(),
      role: 'owner',
      isMuted: false,
      isPinned: false,
    });

    await Promise.all(
      uniqueMemberIds.map(memberId =>
        ctx.db.insert('conversationMembers', {
          conversationId,
          userId: memberId,
          joinedAt: Date.now(),
          role: 'member',
          isMuted: false,
          isPinned: false,
        }),
      ),
    );

    await ctx.db.insert('conversationMessages', {
      conversationId,
      senderId: user._id,
      content: `${user.displayName || user.username} created the group`,
      type: 'text',
    });

    return { success: true, conversationId };
  },
});

export const addGroupMembers = mutation({
  args: {
    conversationId: v.id('conversations'),
    memberIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError('Conversation not found');
    if (conversation.type !== 'group') {
      throw new ConvexError('Can only add members to group conversations');
    }

    const userMembership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!userMembership || userMembership.role !== 'owner') {
      throw new ConvexError('Only the owner can add members');
    }
    const currentMembers = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId),
      )
      .filter(q => q.eq(q.field('leftAt'), undefined))
      .collect();

    if (currentMembers.length + args.memberIds.length > 10) {
      throw new ConvexError('Group conversations are limited to 10 members');
    }

    // Add new members
    const addedMembers: string[] = [];
    for (const memberId of args.memberIds) {
      const existingMember = currentMembers.find(m => m.userId === memberId);
      if (!existingMember) {
        const member = await ctx.db.get(memberId);
        if (member) {
          await ctx.db.insert('conversationMembers', {
            conversationId: args.conversationId,
            userId: memberId,
            joinedAt: Date.now(),
            role: 'member',
            isMuted: false,
            isPinned: false,
          });
          addedMembers.push(member.displayName || member.username);
        }
      }
    }

    // Create system message
    if (addedMembers.length > 0) {
      await ctx.db.insert('conversationMessages', {
        conversationId: args.conversationId,
        senderId: user._id,
        content: `${user.displayName || user.username} added ${addedMembers.join(', ')}`,
        type: 'text',
      });
    }

    return { success: true, addedCount: addedMembers.length };
  },
});

export const leaveGroupConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError('Conversation not found');
    if (conversation.type !== 'group') {
      throw new ConvexError('Can only leave group conversations');
    }

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError('You are not a member of this conversation');
    }

    await ctx.db.patch(membership._id, {
      leftAt: Date.now(),
    });

    await ctx.db.insert('conversationMessages', {
      conversationId: args.conversationId,
      senderId: user._id,
      content: `${user.displayName || user.username} left the group`,
      type: 'text',
    });

    // If owner left, transfer ownership to another member
    if (membership.role === 'owner') {
      const otherMembers = await ctx.db
        .query('conversationMembers')
        .withIndex('by_conversation', q =>
          q.eq('conversationId', args.conversationId),
        )
        .filter(q => q.eq(q.field('leftAt'), undefined))
        .collect();

      if (otherMembers.length > 0) {
        await ctx.db.patch(otherMembers[0]._id, {
          role: 'owner',
        });
        await ctx.db.patch(args.conversationId, {
          ownerId: otherMembers[0].userId,
        });
      } else {
        // No members left, deactivate conversation
        await ctx.db.patch(args.conversationId, {
          isActive: false,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Edit a message
 */
export const editMessage = mutation({
  args: {
    messageId: v.id('conversationMessages'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError('Message not found');

    if (message.senderId !== user._id) {
      throw new ConvexError('You can only edit your own messages');
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id('conversationMessages') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError('Message not found');

    if (message.senderId !== user._id) {
      throw new ConvexError('You can only delete your own messages');
    }

    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
      content: '[Message deleted]',
    });

    return { success: true };
  },
});

/**
 * Mark conversation as read
 */
export const markConversationAsRead = mutation({
  args: {
    conversationId: v.id('conversations'),
    lastMessageId: v.optional(v.id('conversationMessages')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError('You are not a member of this conversation');
    }

    await ctx.db.patch(membership._id, {
      lastReadAt: Date.now(),
      lastReadMessageId: args.lastMessageId,
    });

    return { success: true };
  },
});

/**
 * Update conversation settings
 */
export const updateConversationSettings = mutation({
  args: {
    conversationId: v.id('conversations'),
    isMuted: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    nickname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError('You are not a member of this conversation');
    }

    const updates: Partial<Doc<'conversationMembers'>> = {};
    if (args.isMuted !== undefined) updates.isMuted = args.isMuted;
    if (args.isPinned !== undefined) updates.isPinned = args.isPinned;
    if (args.nickname !== undefined) updates.nickname = args.nickname;

    await ctx.db.patch(membership._id, updates);

    return { success: true };
  },
});

/**
 * Hide conversation from list (can be unhidden when new message arrives)
 */
export const hideConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError('You are not a member of this conversation');
    }

    await ctx.db.patch(membership._id, {
      hiddenAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unhide conversation (show it in list again)
 */
export const unhideConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError('You are not a member of this conversation');
    }

    await ctx.db.patch(membership._id, {
      hiddenAt: undefined,
    });

    return { success: true };
  },
});

/**
 * Start typing indicator
 */
export const startTyping = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    console.log(
      `User ${user._id} started typing in conversation ${args.conversationId}`,
    );

    const existing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    const expiresAt = Date.now() + 10_000;

    if (existing) {
      await ctx.db.patch(existing._id, { startedAt: Date.now(), expiresAt });
    } else {
      await ctx.db.insert('typingIndicators', {
        conversationId: args.conversationId,
        userId: user._id,
        startedAt: Date.now(),
        expiresAt,
      });
    }

    return { success: true };
  },
});

/**
 * Stop typing indicator (called when user clears input)
 */
export const stopTyping = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

export const getConversations = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);

    const memberships = await ctx.db
      .query('conversationMembers')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .filter(q => q.eq(q.field('leftAt'), undefined))
      .collect();

    const conversations = await Promise.all(
      memberships.map(async membership => {
        const conversation = await ctx.db.get(membership.conversationId);
        if (!conversation || !conversation.isActive) return null;

        const lastMessage = await ctx.db
          .query('conversationMessages')
          .withIndex('by_conversation', q =>
            q.eq('conversationId', conversation._id),
          )
          .order('desc')
          .first();

        if (membership.hiddenAt) {
          if (
            !lastMessage ||
            lastMessage._creationTime <= membership.hiddenAt
          ) {
            return null;
          }
        }

        let unreadCount = 0;
        if (membership.lastReadAt) {
          const unreadMessages = await ctx.db
            .query('conversationMessages')
            .withIndex('by_conversation', q =>
              q.eq('conversationId', conversation._id),
            )
            .filter(q =>
              q.and(
                q.neq(q.field('senderId'), user._id),
                q.gt(q.field('_creationTime'), membership.lastReadAt!),
              ),
            )
            .collect();
          unreadCount = unreadMessages.length;
        } else {
          const allMessages = await ctx.db
            .query('conversationMessages')
            .withIndex('by_conversation', q =>
              q.eq('conversationId', conversation._id),
            )
            .filter(q => q.neq(q.field('senderId'), user._id))
            .collect();
          unreadCount = allMessages.length;
        }

        const otherMembers = await ctx.db
          .query('conversationMembers')
          .withIndex('by_conversation', q =>
            q.eq('conversationId', conversation._id),
          )
          .filter(q =>
            q.and(
              q.neq(q.field('userId'), user._id),
              q.eq(q.field('leftAt'), undefined),
            ),
          )
          .collect();

        const memberDetails = await Promise.all(
          otherMembers.map(async m => {
            const u = await ctx.db.get(m.userId);
            if (!u) return null;
            return {
              _id: u._id,
              username: u.username,
              displayName: u.displayName,
              discriminator: u.discriminator,
              avatarUrl: u.avatarUrl,
              status: u.status,
            };
          }),
        );

        let displayName = conversation.name;
        let displayIcon = conversation.iconUrl;

        if (conversation.type === 'direct' && memberDetails.length === 1) {
          const otherUser = memberDetails[0];
          if (otherUser) {
            displayName = otherUser.displayName || otherUser.username;
            displayIcon = otherUser.avatarUrl;
          }
        }

        return {
          _id: conversation._id,
          type: conversation.type,
          name: displayName,
          iconUrl: displayIcon,
          members: memberDetails.filter(
            (m): m is NonNullable<typeof m> => m !== null,
          ),
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                content: lastMessage.content,
                type: lastMessage.type,
                senderId: lastMessage.senderId,
                _creationTime: lastMessage._creationTime,
              }
            : null,
          unreadCount,
          isPinned: membership.isPinned,
          isMuted: membership.isMuted,
          lastMessageAt:
            lastMessage?._creationTime || conversation.lastMessageAt,
        };
      }),
    );

    return conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
      });
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id('conversations'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.leftAt)
      return { page: [], isDone: true, continueCursor: '' };

    const result = await ctx.db
      .query('conversationMessages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId),
      )
      .order('desc')
      .paginate(args.paginationOpts);

    const messagesWithSenders = await Promise.all(
      result.page.map(async msg => {
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

    const filtered = messagesWithSenders.filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    return {
      ...result,
      page: filtered,
    };
  },
});

/**
 * Get typing indicators for a conversation
 */
export const getTypingIndicators = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const now = Date.now();

    const indicators = await ctx.db
      .query('typingIndicators')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId),
      )
      .filter(q =>
        q.and(
          q.neq(q.field('userId'), user._id),
          q.gt(q.field('expiresAt'), now),
        ),
      )
      .collect();

    const usersTyping = await Promise.all(
      indicators.map(async ind => {
        const u = await ctx.db.get(ind.userId);
        if (!u) return null;
        return {
          _id: u._id,
          username: u.username,
          displayName: u.displayName,
        };
      }),
    );

    return usersTyping.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

export const getConversationDetails = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const membership = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation_user', q =>
        q.eq('conversationId', args.conversationId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.leftAt) return null;

    const members = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId),
      )
      .filter(q => q.eq(q.field('leftAt'), undefined))
      .collect();

    const memberDetails = await Promise.all(
      members.map(async m => {
        const u = await ctx.db.get(m.userId);
        if (!u) return null;
        return {
          _id: u._id,
          username: u.username,
          displayName: u.displayName,
          discriminator: u.discriminator,
          avatarUrl: u.avatarUrl,
          status: u.status,
          role: m.role,
          joinedAt: m.joinedAt,
        };
      }),
    );

    let displayName = conversation.name;
    let displayIcon = conversation.iconUrl;

    if (conversation.type === 'direct') {
      const otherMember = memberDetails.find(m => m?._id !== user._id);
      if (otherMember) {
        displayName = otherMember.displayName || otherMember.username;
        displayIcon = otherMember.avatarUrl;
      }
    }

    return {
      ...conversation,
      name: displayName,
      iconUrl: displayIcon,
      members: memberDetails.filter(
        (m): m is NonNullable<typeof m> => m !== null,
      ),
      userMembership: membership,
    };
  },
});

export const checkDMPermission = query({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await canSendDM(ctx, user._id, args.targetUserId);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    const memberships = await ctx.db
      .query('conversationMembers')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .filter(q => q.eq(q.field('leftAt'), undefined))
      .collect();

    let totalUnread = 0;

    for (const membership of memberships) {
      if (membership.lastReadAt) {
        const unreadMessages = await ctx.db
          .query('conversationMessages')
          .withIndex('by_conversation', q =>
            q.eq('conversationId', membership.conversationId),
          )
          .filter(q =>
            q.and(
              q.neq(q.field('senderId'), user._id),
              q.gt(q.field('_creationTime'), membership.lastReadAt!),
            ),
          )
          .collect();
        totalUnread += unreadMessages.length;
      } else {
        const allMessages = await ctx.db
          .query('conversationMessages')
          .withIndex('by_conversation', q =>
            q.eq('conversationId', membership.conversationId),
          )
          .filter(q => q.neq(q.field('senderId'), user._id))
          .collect();
        totalUnread += allMessages.length;
      }
    }

    return totalUnread;
  },
});

/**
 * Find an existing active group conversation with exactly the given members
 */
async function findExactGroupConversation(
  ctx: GenericMutationCtx<DataModel>,
  memberIds: Id<'users'>[],
): Promise<Id<'conversations'> | null> {
  if (memberIds.length < 3) return null;

  const memberIdSet = new Set(memberIds);
  const memberConversations = await Promise.all(
    memberIds.map(userId =>
      ctx.db
        .query('conversationMembers')
        .withIndex('by_user', q => q.eq('userId', userId))
        .filter(q => q.eq(q.field('leftAt'), undefined))
        .collect(),
    ),
  );

  const candidateIds = memberConversations
    .map(convs => new Set(convs.map(c => c.conversationId)))
    .reduce<Set<Id<'conversations'>> | null>((acc, set) => {
      if (!acc) return set;
      const next = new Set<Id<'conversations'>>();
      for (const id of acc) {
        if (set.has(id)) next.add(id);
      }
      return next;
    }, null);

  if (!candidateIds || candidateIds.size === 0) return null;

  for (const conversationId of candidateIds) {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || !conversation.isActive) continue;
    if (conversation.type !== 'group') continue;

    const members = await ctx.db
      .query('conversationMembers')
      .withIndex('by_conversation', q => q.eq('conversationId', conversationId))
      .filter(q => q.eq(q.field('leftAt'), undefined))
      .collect();

    if (members.length !== memberIds.length) continue;
    const sameMembers = members.every(m => memberIdSet.has(m.userId));
    if (sameMembers) return conversationId;
  }

  return null;
}

/**
 * Get or create a conversation for selected members (direct or group)
 */
export const getOrCreateConversationForMembers = mutation({
  args: {
    memberIds: v.array(v.id('users')),
    name: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    iconStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const uniqueMemberIds = Array.from(
      new Set(args.memberIds.filter(id => id !== user._id)),
    );

    if (uniqueMemberIds.length === 0) {
      throw new ConvexError('At least one other member is required');
    }

    if (uniqueMemberIds.length > 9) {
      throw new ConvexError('Group conversations are limited to 10 members');
    }

    // Permission check for all members
    for (const memberId of uniqueMemberIds) {
      const permissionCheck = await canSendDM(ctx, user._id, memberId);
      if (!permissionCheck.canSend) {
        throw new ConvexError(
          permissionCheck.reason || 'Cannot create conversation',
        );
      }
    }

    if (uniqueMemberIds.length === 1) {
      const conversationId = await getOrCreateDirectConversation(
        ctx,
        user._id,
        uniqueMemberIds[0],
      );
      return { success: true, conversationId, created: false };
    }

    const allMemberIds = [user._id, ...uniqueMemberIds];

    const existingConversationId = await findExactGroupConversation(
      ctx,
      allMemberIds,
    );

    if (existingConversationId) {
      return {
        success: true,
        conversationId: existingConversationId,
        created: false,
      };
    }

    const conversationId = await ctx.db.insert('conversations', {
      type: 'group',
      name: args.name,
      iconUrl: args.iconUrl,
      iconStorageId: args.iconStorageId,
      ownerId: user._id,
      isActive: true,
      createdBy: user._id,
      lastMessageAt: Date.now(),
    });

    await ctx.db.insert('conversationMembers', {
      conversationId,
      userId: user._id,
      joinedAt: Date.now(),
      role: 'owner',
      isMuted: false,
      isPinned: false,
    });

    await Promise.all(
      uniqueMemberIds.map(memberId =>
        ctx.db.insert('conversationMembers', {
          conversationId,
          userId: memberId,
          joinedAt: Date.now(),
          role: 'member',
          isMuted: false,
          isPinned: false,
        }),
      ),
    );

    await ctx.db.insert('conversationMessages', {
      conversationId,
      senderId: user._id,
      content: `${user.displayName || user.username} created the group`,
      type: 'text',
    });

    return { success: true, conversationId, created: true };
  },
});
