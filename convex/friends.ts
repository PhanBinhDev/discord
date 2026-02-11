import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { query } from './_generated/server';
import { mutation } from './functions';
import { getCurrent, getCurrentUserOrThrow } from './users';

export const sendFriendRequest = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new ConvexError('Target user not found');

    if (user._id === args.targetUserId) {
      throw new ConvexError('Cannot send friend request to yourself');
    }

    const targetSettings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .first();

    if (targetSettings && !targetSettings.privacy.allowFriendRequests) {
      throw new ConvexError('This user is not accepting friend requests');
    }

    // Normalize: userId1 should always be smaller than userId2
    const [userId1, userId2] = [user._id, args.targetUserId].sort();

    const existingRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', userId1).eq('userId2', userId2),
      )
      .first();

    if (existingRelation) {
      if (existingRelation.status === 'accepted') {
        throw new ConvexError('Already friends');
      }
      if (existingRelation.status === 'pending') {
        throw new ConvexError('Friend request already sent');
      }
      if (existingRelation.status === 'blocked') {
        throw new ConvexError('Cannot send friend request');
      }
    }

    const friendRequestId = await ctx.db.insert('friends', {
      userId1,
      userId2,
      status: 'pending',
      requestedBy: user._id,
    });

    return { success: true, friendRequestId };
  },
});

export const sendFriendRequestByUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.username))
      .first();

    if (!targetUser) {
      throw new ConvexError(
        'servers.directMessage.addFriend.errors.userNotFound',
      );
    }

    if (user._id === targetUser._id) {
      throw new ConvexError(
        'servers.directMessage.addFriend.errors.cannotAddSelf',
      );
    }

    const targetSettings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', targetUser._id))
      .first();

    if (targetSettings && !targetSettings.privacy.allowFriendRequests) {
      throw new ConvexError(
        'servers.directMessage.addFriend.errors.userNotAcceptingRequests',
      );
    }

    // Normalize: userId1 should always be smaller than userId2
    const [userId1, userId2] = [user._id, targetUser._id].sort();

    const existingRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', userId1).eq('userId2', userId2),
      )
      .first();

    if (existingRelation) {
      if (existingRelation.status === 'accepted') {
        throw new ConvexError(
          'servers.directMessage.addFriend.errors.alreadyFriends',
        );
      }
      if (existingRelation.status === 'pending') {
        throw new ConvexError(
          'servers.directMessage.addFriend.errors.requestAlreadySent',
        );
      }
      if (existingRelation.status === 'blocked') {
        throw new ConvexError(
          'servers.directMessage.addFriend.errors.cannotSendRequest',
        );
      }
    }

    const friendRequestId = await ctx.db.insert('friends', {
      userId1,
      userId2,
      status: 'pending',
      requestedBy: user._id,
    });

    return { success: true, friendRequestId };
  },
});

export const acceptFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new ConvexError('Friend request not found');

    if (friendRequest.userId2 !== user._id) {
      throw new ConvexError('You can only accept requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new ConvexError('Friend request is not pending');
    }

    await ctx.db.patch(args.friendRequestId, {
      status: 'accepted',
      acceptedAt: Date.now(),
    });

    return { success: true };
  },
});

export const rejectFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new ConvexError('Friend request not found');

    if (friendRequest.userId2 !== user._id) {
      throw new ConvexError('You can only reject requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new ConvexError('Friend request is not pending');
    }

    await ctx.db.patch(args.friendRequestId, {
      status: 'rejected',
    });

    return { success: true };
  },
});

export const cancelFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new ConvexError('Friend request not found');

    if (friendRequest.requestedBy !== user._id) {
      throw new ConvexError('You can only cancel requests you sent');
    }

    if (friendRequest.status !== 'pending') {
      throw new ConvexError('Friend request is not pending');
    }

    await ctx.db.delete(args.friendRequestId);

    return { success: true };
  },
});

export const removeFriend = mutation({
  args: { friendId: v.id('friends') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const friendship = await ctx.db.get(args.friendId);
    if (!friendship) throw new ConvexError('Friendship not found');

    if (friendship.userId1 !== user._id && friendship.userId2 !== user._id) {
      throw new ConvexError('You are not part of this friendship');
    }

    await ctx.db.delete(args.friendId);

    return { success: true };
  },
});

export const blockUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user._id === args.targetUserId) {
      throw new ConvexError('Cannot block yourself');
    }

    const existingRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', user._id).eq('userId2', args.targetUserId),
      )
      .first();

    const reverseRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', args.targetUserId).eq('userId2', user._id),
      )
      .first();

    if (existingRelation) {
      await ctx.db.patch(existingRelation._id, {
        status: 'blocked',
      });
    } else if (reverseRelation) {
      await ctx.db.delete(reverseRelation._id);
      await ctx.db.insert('friends', {
        userId1: user._id,
        userId2: args.targetUserId,
        status: 'blocked',
        requestedBy: user._id,
      });
    } else {
      await ctx.db.insert('friends', {
        userId1: user._id,
        userId2: args.targetUserId,
        status: 'blocked',
        requestedBy: user._id,
      });
    }

    return { success: true };
  },
});

export const unblockUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const blockedRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', user._id).eq('userId2', args.targetUserId),
      )
      .first();

    if (!blockedRelation || blockedRelation.status !== 'blocked') {
      throw new ConvexError('User is not blocked');
    }

    await ctx.db.delete(blockedRelation._id);

    return { success: true };
  },
});

export const getFriends = query({
  args: {
    search: v.optional(v.string()),
    statusFilter: v.optional(v.union(v.literal('online'), v.literal('all'))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const allFriendships = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), user._id),
            q.eq(q.field('userId2'), user._id),
          ),
          q.eq(q.field('status'), 'accepted'),
        ),
      )
      .collect();

    let friends = await Promise.all(
      allFriendships.map(async friendship => {
        const friendId =
          friendship.userId1 === user._id
            ? friendship.userId2
            : friendship.userId1;
        const friend = await ctx.db.get(friendId);
        if (!friend) return null;

        return {
          friendshipId: friendship._id,
          user: {
            _id: friend._id,
            username: friend.username,
            displayName: friend.displayName,
            discriminator: friend.discriminator,
            avatarUrl: friend.avatarUrl,
            status: friend.status,
            customStatus: friend.customStatus,
          },
          since: friendship.acceptedAt || friendship._creationTime,
        };
      }),
    );

    friends = friends.filter(
      (friend): friend is NonNullable<typeof friend> => friend !== null,
    );

    if (args.statusFilter === 'online') {
      friends = friends.filter(friend => friend?.user.status === 'online');
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      friends = friends.filter(
        friend =>
          friend?.user.username.toLowerCase().includes(searchLower) ||
          friend?.user.displayName?.toLowerCase().includes(searchLower),
      );
    }

    const { numItems, cursor } = args.paginationOpts;
    let startIndex = 0;

    if (cursor) {
      startIndex = parseInt(cursor, 10);
    }

    const endIndex = startIndex + numItems;
    const page = friends.slice(startIndex, endIndex);
    const isDone = endIndex >= friends.length;
    const continueCursor = isDone ? '' : endIndex.toString();

    return { page, isDone, continueCursor };
  },
});

export const getPendingRequests = query({
  args: {
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const allPending = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), user._id),
            q.eq(q.field('userId2'), user._id),
          ),
          q.eq(q.field('status'), 'pending'),
          q.neq(q.field('requestedBy'), user._id),
        ),
      )
      .collect();

    let requestsWithUsers = await Promise.all(
      allPending.map(async request => {
        const senderId = request.requestedBy;
        const sender = await ctx.db.get(senderId);
        if (!sender) return null;

        return {
          requestId: request._id,
          from: {
            _id: sender._id,
            username: sender.username,
            displayName: sender.displayName,
            discriminator: sender.discriminator,
            avatarUrl: sender.avatarUrl,
          },
          _creationTime: request._creationTime,
        };
      }),
    );

    requestsWithUsers = requestsWithUsers.filter(
      (req): req is NonNullable<typeof req> => req !== null,
    );

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      requestsWithUsers = requestsWithUsers.filter(
        req =>
          req?.from.username.toLowerCase().includes(searchLower) ||
          req?.from.displayName?.toLowerCase().includes(searchLower),
      );
    }

    // Manual pagination
    const { numItems, cursor } = args.paginationOpts;
    let startIndex = 0;

    if (cursor) {
      startIndex = parseInt(cursor, 10);
    }

    const endIndex = startIndex + numItems;
    const page = requestsWithUsers.slice(startIndex, endIndex);
    const isDone = endIndex >= requestsWithUsers.length;
    const continueCursor = isDone ? '' : endIndex.toString();

    return { page, isDone, continueCursor };
  },
});

export const getSentRequests = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);

    const requests = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async request => {
        const receiver = await ctx.db.get(request.userId2);
        if (!receiver) return null;

        return {
          requestId: request._id,
          to: {
            _id: receiver._id,
            username: receiver.username,
            displayName: receiver.displayName,
            discriminator: receiver.discriminator,
            avatarUrl: receiver.avatarUrl,
          },
          _creationTime: request._creationTime,
        };
      }),
    );

    return requestsWithUsers.filter(
      (req): req is NonNullable<typeof req> => req !== null,
    );
  },
});

export const getBlockedUsers = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return [];

    const blocked = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .filter(q => q.eq(q.field('status'), 'blocked'))
      .collect();

    const blockedUsers = await Promise.all(
      blocked.map(async block => {
        const blockedUser = await ctx.db.get(block.userId2);
        if (!blockedUser) return null;

        return {
          blockId: block._id,
          user: {
            _id: blockedUser._id,
            username: blockedUser.username,
            displayName: blockedUser.displayName,
            discriminator: blockedUser.discriminator,
            avatarUrl: blockedUser.avatarUrl,
          },
        };
      }),
    );

    return blockedUsers.filter(
      (blocked): blocked is NonNullable<typeof blocked> => blocked !== null,
    );
  },
});

export const getFriendshipStatus = query({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrent(ctx);

    if (!user) return null;

    // Normalize: userId1 should always be smaller than userId2
    const [userId1, userId2] = [user._id, args.targetUserId].sort();

    const relation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', userId1).eq('userId2', userId2),
      )
      .first();

    if (!relation) {
      return { status: 'none' as const };
    }

    return {
      status: relation.status,
      relationId: relation._id,
      requestedBy: relation.requestedBy,
      canAccept:
        relation.status === 'pending' && relation.requestedBy !== user._id,
      canCancel:
        relation.status === 'pending' && relation.requestedBy === user._id,
    };
  },
});

export const hasFriends = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return false;

    const friendship1 = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .first();

    if (friendship1) return true;

    const friendship2 = await ctx.db
      .query('friends')
      .withIndex('by_user2', q => q.eq('userId2', user._id))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .first();

    return !!friendship2;
  },
});
export const hasPending = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return false;

    // Check if there are any pending requests where user is recipient (not requester)
    const pending = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), user._id),
            q.eq(q.field('userId2'), user._id),
          ),
          q.eq(q.field('status'), 'pending'),
          q.neq(q.field('requestedBy'), user._id),
        ),
      )
      .first();

    return !!pending;
  },
});


