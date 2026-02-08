import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getCurrent, getCurrentUserOrThrow } from './users';

export const sendFriendRequest = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error('Target user not found');

    if (user._id === args.targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    const targetSettings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .first();

    if (targetSettings && !targetSettings.privacy.allowFriendRequests) {
      throw new Error('This user is not accepting friend requests');
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

    if (existingRelation || reverseRelation) {
      const relation = existingRelation || reverseRelation;
      if (relation?.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (relation?.status === 'pending') {
        throw new Error('Friend request already sent');
      }
      if (relation?.status === 'blocked') {
        throw new Error('Cannot send friend request');
      }
    }

    const friendRequestId = await ctx.db.insert('friends', {
      userId1: user._id,
      userId2: args.targetUserId,
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
    if (!friendRequest) throw new Error('Friend request not found');

    if (friendRequest.userId2 !== user._id) {
      throw new Error('You can only accept requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
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
    if (!friendRequest) throw new Error('Friend request not found');

    if (friendRequest.userId2 !== user._id) {
      throw new Error('You can only reject requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
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
    if (!friendRequest) throw new Error('Friend request not found');

    if (friendRequest.requestedBy !== user._id) {
      throw new Error('You can only cancel requests you sent');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
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
    if (!friendship) throw new Error('Friendship not found');

    if (friendship.userId1 !== user._id && friendship.userId2 !== user._id) {
      throw new Error('You are not part of this friendship');
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
      throw new Error('Cannot block yourself');
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
      throw new Error('User is not blocked');
    }

    await ctx.db.delete(blockedRelation._id);

    return { success: true };
  },
});

export const getFriends = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return [];

    const friendships1 = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .collect();

    const friendships2 = await ctx.db
      .query('friends')
      .withIndex('by_user2', q => q.eq('userId2', user._id))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    const friends = await Promise.all(
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

    return friends.filter(
      (friend): friend is NonNullable<typeof friend> => friend !== null,
    );
  },
});

export const getPendingRequests = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);
    if (!user) return [];

    const requests = await ctx.db
      .query('friends')
      .withIndex('by_user2', q => q.eq('userId2', user._id))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async request => {
        const sender = await ctx.db.get(request.userId1);
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

    return requestsWithUsers.filter(
      (req): req is NonNullable<typeof req> => req !== null,
    );
  },
});

export const getSentRequests = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return [];

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

    const relation1 = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', user._id).eq('userId2', args.targetUserId),
      )
      .first();

    const relation2 = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', args.targetUserId).eq('userId2', user._id),
      )
      .first();

    const relation = relation1 || relation2;

    if (!relation) {
      return { status: 'none' as const };
    }

    return {
      status: relation.status,
      relationId: relation._id,
      requestedBy: relation.requestedBy,
      canAccept: relation.status === 'pending' && relation.userId2 === user._id,
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
