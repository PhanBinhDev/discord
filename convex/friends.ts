import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Send friend request
export const sendFriendRequest = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error('Target user not found');

    if (user._id === args.targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if target allows friend requests
    const targetSettings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .first();

    if (targetSettings && !targetSettings.privacy.allowFriendRequests) {
      throw new Error('This user is not accepting friend requests');
    }

    // Check if already friends or request exists
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

    // Create friend request
    const friendRequestId = await ctx.db.insert('friends', {
      userId1: user._id,
      userId2: args.targetUserId,
      status: 'pending',
      requestedBy: user._id,
      createdAt: Date.now(),
    });

    return { success: true, friendRequestId };
  },
});

// Accept friend request
export const acceptFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new Error('Friend request not found');

    // Verify user is the receiver
    if (friendRequest.userId2 !== user._id) {
      throw new Error('You can only accept requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Update to accepted
    await ctx.db.patch(args.friendRequestId, {
      status: 'accepted',
      acceptedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reject friend request
export const rejectFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new Error('Friend request not found');

    // Verify user is the receiver
    if (friendRequest.userId2 !== user._id) {
      throw new Error('You can only reject requests sent to you');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Update to rejected
    await ctx.db.patch(args.friendRequestId, {
      status: 'rejected',
    });

    return { success: true };
  },
});

// Cancel sent friend request
export const cancelFriendRequest = mutation({
  args: { friendRequestId: v.id('friends') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const friendRequest = await ctx.db.get(args.friendRequestId);
    if (!friendRequest) throw new Error('Friend request not found');

    // Verify user is the sender
    if (friendRequest.requestedBy !== user._id) {
      throw new Error('You can only cancel requests you sent');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Delete the request
    await ctx.db.delete(args.friendRequestId);

    return { success: true };
  },
});

// Remove friend
export const removeFriend = mutation({
  args: { friendId: v.id('friends') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const friendship = await ctx.db.get(args.friendId);
    if (!friendship) throw new Error('Friendship not found');

    // Verify user is part of this friendship
    if (friendship.userId1 !== user._id && friendship.userId2 !== user._id) {
      throw new Error('You are not part of this friendship');
    }

    // Delete the friendship
    await ctx.db.delete(args.friendId);

    return { success: true };
  },
});

// Block user
export const blockUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    if (user._id === args.targetUserId) {
      throw new Error('Cannot block yourself');
    }

    // Check if relation exists
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
      // Update existing to blocked
      await ctx.db.patch(existingRelation._id, {
        status: 'blocked',
      });
    } else if (reverseRelation) {
      // Delete reverse relation and create blocked relation
      await ctx.db.delete(reverseRelation._id);
      await ctx.db.insert('friends', {
        userId1: user._id,
        userId2: args.targetUserId,
        status: 'blocked',
        requestedBy: user._id,
        createdAt: Date.now(),
      });
    } else {
      // Create new blocked relation
      await ctx.db.insert('friends', {
        userId1: user._id,
        userId2: args.targetUserId,
        status: 'blocked',
        requestedBy: user._id,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Unblock user
export const unblockUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const blockedRelation = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', user._id).eq('userId2', args.targetUserId),
      )
      .first();

    if (!blockedRelation || blockedRelation.status !== 'blocked') {
      throw new Error('User is not blocked');
    }

    // Delete the block
    await ctx.db.delete(blockedRelation._id);

    return { success: true };
  },
});

export const getFriends = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

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
          since: friendship.acceptedAt || friendship.createdAt,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

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
          createdAt: request.createdAt,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return [];

    // Get requests sent by user
    const requests = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .collect();

    // Get receiver details
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
          createdAt: request.createdAt,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    // Check both directions
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

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
