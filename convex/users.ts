/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserJSON } from '@clerk/backend';
import { GenericMutationCtx } from 'convex/server';
import { ConvexError, v, Validator } from 'convex/values';
import removeAccents from 'remove-accents';
import { internal } from './_generated/api';
import { DataModel, Id } from './_generated/dataModel';
import { query, QueryCtx } from './_generated/server';
import { internalMutation, mutation } from './functions';
import { UserStatus } from './schema';

export const currentUser = query({
  args: {},
  handler: async ctx => {
    return await getCurrent(ctx);
  },
});

export async function getCurrent(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrent(ctx);
  if (!userRecord)
    throw new ConvexError({
      message: 'User not authenticated',
      status: 401,
    });
  return userRecord;
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', q => q.eq('clerkId', externalId))
    .unique();
}

export const upsertFromClerk = mutation({
  args: { data: v.any() as Validator<UserJSON> },
  handler: async (ctx, { data }) => {
    const user = await userByExternalId(ctx, data.id);

    console.log(`Upserting user from Clerk webhook: ${data.id}`);

    const primaryEmail = data.email_addresses?.find(
      e => e.id === data.primary_email_address_id,
    );
    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') ||
      data.username ||
      '';
    const discriminator = Math.floor(1000 + Math.random() * 9000).toString();
    const baseUsername =
      data.username || displayName.replace(/\s+/g, '').toLowerCase() || 'user';
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const username = `${baseUsername}_${randomSuffix}`;
    const searchText = `${displayName} ${data.username} ${primaryEmail?.email_address}`;
    const searchTextNoAccents = removeAccents(searchText);

    const payload = {
      clerkId: data.id,
      email: primaryEmail?.email_address ?? '',
      username: user?.username ?? username,
      displayName,
      discriminator,
      avatarUrl: user?.avatarStorageId ? user.avatarUrl : data.image_url,
      emailVerified: primaryEmail?.verification?.status === 'verified',
      status: 'online' as UserStatus,
      lastSeen: Date.now(),
      searchText: searchTextNoAccents,
    };
    if (user === null) {
      console.log(`Creating new user for clerkId ${data.id}`);

      const userId = await ctx.db.insert('users', payload);

      console.log(`New user created with id ${userId}`);
      await ctx.scheduler.runAfter(0, internal.users.createDefaultSettings, {
        userId,
      });
    } else {
      console.log(`Updating existing user for clerkId ${data.id}`);
      await ctx.db.patch(user._id, payload);
    }
  },
});

export const updateSearchText = internalMutation({
  args: {
    userId: v.id('users'),
    text: v.string(),
  },
  handler: async (ctx, { userId, text }) => {
    await ctx.db.patch(userId, {
      searchText: removeAccents(text),
    });
  },
});

export const createDefaultSettings = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first();

    if (existing) return;

    await ctx.db.insert('userSettings', {
      userId,
      theme: 'dark',
      accentColor: 'blue',
      language: 'en',
      notifications: {
        messages: true,
        mentions: true,
        directMessages: true,
        calls: true,
        sounds: true,
      },
      privacy: {
        dmPermission: 'server_members',
        allowFriendRequests: true,
        showOnlineStatus: true,
      },
      appearance: {
        messageDisplayCompact: false,
        showEmbeds: true,
        showReactions: true,
        animateEmojis: true,
      },
      voice: {
        defaultMuted: false,
        defaultDeafened: false,
        inputVolume: 100,
        outputVolume: 100,
      },
    });
  },
});

export const updateUser = mutation({
  args: {
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(UserStatus),
    statusExpiration: v.optional(v.number()),
    customStatus: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    bannerUrl: v.optional(v.string()),
    bannerStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const updates: any = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.status !== undefined) updates.status = args.status;
    if (args.customStatus !== undefined)
      updates.customStatus = args.customStatus;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.avatarStorageId !== undefined)
      updates.avatarStorageId = args.avatarStorageId;
    if (args.bannerUrl !== undefined) updates.bannerUrl = args.bannerUrl;
    if (args.bannerStorageId !== undefined)
      updates.bannerStorageId = args.bannerStorageId;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', clerkId))
      .first();

    if (!user) {
      console.log(`User with clerkId ${clerkId} not found`);
      return;
    }

    const deletedUser = await getOrCreateDeletedUser(ctx);

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .first();
    if (settings) {
      await ctx.db.delete(settings._id);
    }

    const ownedServers = await ctx.db
      .query('servers')
      .withIndex('by_owner', q => q.eq('ownerId', user._id))
      .collect();

    for (const server of ownedServers) {
      const firstAdmin = await ctx.db
        .query('serverMembers')
        .withIndex('by_server', q => q.eq('serverId', server._id))
        .filter(q =>
          q.and(
            q.eq(q.field('role'), 'admin'),
            q.neq(q.field('userId'), user._id),
          ),
        )
        .first();

      if (firstAdmin) {
        await ctx.db.patch(server._id, { ownerId: firstAdmin.userId });
      } else {
        const firstModerator = await ctx.db
          .query('serverMembers')
          .withIndex('by_server', q => q.eq('serverId', server._id))
          .filter(q =>
            q.and(
              q.eq(q.field('role'), 'moderator'),
              q.neq(q.field('userId'), user._id),
            ),
          )
          .first();

        if (firstModerator) {
          await ctx.db.patch(firstModerator._id, { role: 'admin' });
          await ctx.db.patch(server._id, { ownerId: firstModerator.userId });
        } else {
          await deleteServerCascade(ctx, server._id);
        }
      }
    }

    const memberships = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);

      const server = await ctx.db.get(membership.serverId);
      if (server) {
        await ctx.db.patch(server._id, {
          memberCount: Math.max(0, server.memberCount - 1),
        });
      }
    }

    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const userRole of userRoles) {
      await ctx.db.delete(userRole._id);
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const message of messages) {
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.storageId) {
            try {
              await ctx.storage.delete(attachment.storageId);
            } catch (error) {
              console.error('Failed to delete message attachment:', error);
            }
          }
        }
      }

      await ctx.db.patch(message._id, {
        userId: deletedUser._id,
        attachments: undefined,
      });
    }

    const sentDMs = await ctx.db
      .query('directMessages')
      .withIndex('by_sender', q => q.eq('senderId', user._id))
      .collect();

    const receivedDMs = await ctx.db
      .query('directMessages')
      .withIndex('by_receiver', q => q.eq('receiverId', user._id))
      .collect();

    for (const dm of sentDMs) {
      if (dm.attachments) {
        for (const attachment of dm.attachments) {
          if (attachment.storageId) {
            try {
              await ctx.storage.delete(attachment.storageId);
            } catch (error) {
              console.error('Failed to delete DM attachment:', error);
            }
          }
        }
      }

      await ctx.db.patch(dm._id, {
        senderId: deletedUser._id,
        attachments: undefined,
      });
    }

    for (const dm of receivedDMs) {
      await ctx.db.patch(dm._id, {
        receiverId: deletedUser._id,
      });
    }

    const reactions = await ctx.db
      .query('reactions')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    const friendships1 = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('userId1', user._id))
      .collect();

    const friendships2 = await ctx.db
      .query('friends')
      .withIndex('by_user2', q => q.eq('userId2', user._id))
      .collect();

    for (const friendship of [...friendships1, ...friendships2]) {
      await ctx.db.delete(friendship._id);
    }

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    const voiceStates = await ctx.db
      .query('voiceChannelStates')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const voiceState of voiceStates) {
      await ctx.db.delete(voiceState._id);
    }

    const invites = await ctx.db
      .query('serverInvites')
      .withIndex('by_inviter', q => q.eq('inviterId', user._id))
      .collect();

    for (const invite of invites) {
      await ctx.db.patch(invite._id, {
        status: 'revoked',
      });
    }

    const boosts = await ctx.db
      .query('serverBoosts')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const boost of boosts) {
      await ctx.db.delete(boost._id);
    }

    const webhooks = await ctx.db.query('webhooks').collect();

    for (const webhook of webhooks) {
      if (webhook.creatorId === user._id) {
        await ctx.db.patch(webhook._id, {
          creatorId: deletedUser._id,
        });
      }
    }

    const eventLogs = await ctx.db
      .query('eventLogs')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const log of eventLogs) {
      await ctx.db.patch(log._id, {
        userId: deletedUser._id,
      });
    }

    const reportsMade = await ctx.db
      .query('reports')
      .withIndex('by_reporter', q => q.eq('reportedBy', user._id))
      .collect();

    const reportsReceived = await ctx.db
      .query('reports')
      .withIndex('by_reported_user', q => q.eq('reportedUserId', user._id))
      .collect();

    for (const report of reportsMade) {
      await ctx.db.patch(report._id, {
        reportedBy: deletedUser._id,
      });
    }

    for (const report of reportsReceived) {
      await ctx.db.patch(report._id, {
        reportedUserId: deletedUser._id,
      });
    }

    const lastViewedChannels = await ctx.db
      .query('userLastViewedChannels')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const record of lastViewedChannels) {
      await ctx.db.delete(record._id);
    }

    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (error) {
        console.error('Failed to delete avatar:', error);
      }
    }

    if (user.bannerStorageId) {
      try {
        await ctx.storage.delete(user.bannerStorageId);
      } catch (error) {
        console.error('Failed to delete banner:', error);
      }
    }

    await ctx.db.delete(user._id);
    console.log(`User ${user.email} deleted, data anonymized`);
  },
});

async function deleteServerCascade(
  ctx: GenericMutationCtx<DataModel>,
  serverId: Id<'servers'>,
) {
  const channels = await ctx.db
    .query('channels')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .collect();

  for (const channel of channels) {
    const permissions = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', channel._id))
      .collect();

    for (const permission of permissions) {
      await ctx.db.delete(permission._id);
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_channel', q => q.eq('channelId', channel._id))
      .collect();

    for (const message of messages) {
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.storageId) {
            try {
              await ctx.storage.delete(attachment.storageId);
            } catch (error) {
              console.error('Failed to delete attachment:', error);
            }
          }
        }
      }
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(channel._id);
  }

  const categories = await ctx.db
    .query('channelCategories')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .collect();

  for (const category of categories) {
    await ctx.db.delete(category._id);
  }

  const roles = await ctx.db
    .query('roles')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .collect();

  for (const role of roles) {
    await ctx.db.delete(role._id);
  }

  const members = await ctx.db
    .query('serverMembers')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .collect();

  for (const member of members) {
    await ctx.db.delete(member._id);
  }

  const server = await ctx.db.get(serverId);
  if (server) {
    if (server.iconStorageId) {
      try {
        await ctx.storage.delete(server.iconStorageId);
      } catch (error) {
        console.error('Failed to delete server icon:', error);
      }
    }

    if (server.bannerStorageId) {
      try {
        await ctx.storage.delete(server.bannerStorageId);
      } catch (error) {
        console.error('Failed to delete server banner:', error);
      }
    }
  }

  await ctx.db.delete(serverId);
}

async function getOrCreateDeletedUser(ctx: GenericMutationCtx<DataModel>) {
  const DELETED_USER_CLERK_ID = 'deleted_user_placeholder';

  let deletedUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', q => q.eq('clerkId', DELETED_USER_CLERK_ID))
    .first();

  if (!deletedUser) {
    const deletedUserId = await ctx.db.insert('users', {
      clerkId: DELETED_USER_CLERK_ID,
      email: 'deleted@system.local',
      username: 'DeletedUser',
      displayName: 'Deleted User',
      discriminator: '0000',
      emailVerified: true,
      status: 'offline',
      searchText: '',
    });

    deletedUser = await ctx.db.get(deletedUserId);
  }

  return deletedUser!;
}

export const getUserSettings = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);

    if (!user) return null;

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .first();

    return settings;
  },
});

export const updateUserSettings = mutation({
  args: {
    theme: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    language: v.optional(v.string()),
    notifications: v.optional(
      v.object({
        messages: v.boolean(),
        mentions: v.boolean(),
        directMessages: v.boolean(),
        calls: v.boolean(),
        sounds: v.boolean(),
      }),
    ),
    privacy: v.optional(
      v.object({
        dmPermission: v.optional(
          v.union(
            v.literal('everyone'),
            v.literal('friends'),
            v.literal('server_members'),
            v.literal('none'),
          ),
        ),
        allowFriendRequests: v.boolean(),
        showOnlineStatus: v.boolean(),
      }),
    ),
    appearance: v.optional(
      v.object({
        messageDisplayCompact: v.boolean(),
        showEmbeds: v.boolean(),
        showReactions: v.boolean(),
        animateEmojis: v.boolean(),
      }),
    ),
    voice: v.optional(
      v.object({
        defaultMuted: v.boolean(),
        defaultDeafened: v.boolean(),
        inputVolume: v.optional(v.number()),
        outputVolume: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .first();

    if (!settings) throw new Error('Settings not found');

    const updates: any = {};

    if (args.theme !== undefined) updates.theme = args.theme;
    if (args.accentColor !== undefined) updates.accentColor = args.accentColor;
    if (args.language !== undefined) updates.language = args.language;
    if (args.notifications !== undefined)
      updates.notifications = args.notifications;
    if (args.privacy !== undefined) updates.privacy = args.privacy;
    if (args.appearance !== undefined) updates.appearance = args.appearance;
    if (args.voice !== undefined) updates.voice = args.voice;

    await ctx.db.patch(settings._id, updates);

    return { success: true };
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!user) {
      console.log('User not found in DB, skipping heartbeat');
      return { success: false, reason: 'user_not_synced' };
    }

    const now = Date.now();
    const isManualOffline = user.status === 'offline' && user.customStatus;
    const isStatusExpired = user.statusExpiredAt && user.statusExpiredAt < now;
    const shouldUpdateToOnline =
      !user.status ||
      (user.status === 'offline' && !isManualOffline) ||
      isStatusExpired;

    if (shouldUpdateToOnline) {
      await ctx.db.patch(user._id, {
        status: 'online',
        statusExpiredAt: undefined,
        lastSeen: now,
      });
    }

    return { success: true };
  },
});

export const updatePresence = mutation({
  args: {
    status: UserStatus,
    customStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      status: args.status,
      customStatus: args.customStatus,
      lastSeen: Date.now(),
    });

    return { success: true };
  },
});

export const setUserBusy = mutation({
  args: {
    callId: v.optional(v.id('calls')),
    meetingId: v.optional(v.id('meetings')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      status: 'busy',
      customStatus: args.callId ? 'In a call' : 'In a meeting',
      lastSeen: Date.now(),
    });
  },
});

export const setUserAvailable = mutation({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.status === 'busy') {
      await ctx.db.patch(user._id, {
        status: 'online',
        customStatus: undefined,
        lastSeen: Date.now(),
      });
    }
  },
});

export const getUserPresence = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      status: user.status || 'offline',
      customStatus: user.customStatus,
      lastSeen: user.lastSeen,
    };
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.username))
      .first();
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrent(ctx);

    if (!user) return [];

    const limit = args.limit || 10;

    const searchResults = await ctx.db
      .query('users')
      .withSearchIndex('searchText', q =>
        q.search('searchText', removeAccents(args.query)),
      )
      .take(limit);

    const filteredResults = searchResults.filter(u => u._id !== user._id);

    return filteredResults;
  },
});

export const getCommonCounts = query({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const current = await getCurrentUserOrThrow(ctx);

    if (current._id === args.targetUserId) {
      return { commonFriends: 0, commonServers: 0 };
    }

    const currentFriends = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), current._id),
            q.eq(q.field('userId2'), current._id),
          ),
          q.eq(q.field('status'), 'accepted'),
        ),
      )
      .collect();

    const currentFriendIds = new Set(
      currentFriends.map(f =>
        f.userId1 === current._id ? f.userId2 : f.userId1,
      ),
    );

    const targetFriends = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), args.targetUserId),
            q.eq(q.field('userId2'), args.targetUserId),
          ),
          q.eq(q.field('status'), 'accepted'),
        ),
      )
      .collect();

    let commonFriends = 0;
    for (const f of targetFriends) {
      const friendId = f.userId1 === args.targetUserId ? f.userId2 : f.userId1;
      if (
        friendId !== current._id &&
        friendId !== args.targetUserId &&
        currentFriendIds.has(friendId)
      ) {
        commonFriends += 1;
      }
    }

    const currentServers = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', current._id))
      .collect();

    const targetServers = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .collect();

    const currentServerIds = new Set(currentServers.map(m => m.serverId));

    let commonServers = 0;
    for (const m of targetServers) {
      if (currentServerIds.has(m.serverId)) {
        commonServers += 1;
      }
    }

    return { commonFriends, commonServers };
  },
});

export const getCommonDetails = query({
  args: {
    targetUserId: v.id('users'),
    friendsLimit: v.optional(v.number()),
    serversLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const current = await getCurrentUserOrThrow(ctx);

    if (current._id === args.targetUserId) {
      return {
        commonFriends: 0,
        commonServers: 0,
        friends: [],
        servers: [],
      };
    }

    const currentFriends = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), current._id),
            q.eq(q.field('userId2'), current._id),
          ),
          q.eq(q.field('status'), 'accepted'),
        ),
      )
      .collect();

    const currentFriendIds = new Set(
      currentFriends.map(f =>
        f.userId1 === current._id ? f.userId2 : f.userId1,
      ),
    );

    const targetFriends = await ctx.db
      .query('friends')
      .filter(q =>
        q.and(
          q.or(
            q.eq(q.field('userId1'), args.targetUserId),
            q.eq(q.field('userId2'), args.targetUserId),
          ),
          q.eq(q.field('status'), 'accepted'),
        ),
      )
      .collect();

    const mutualFriendIds: Id<'users'>[] = [];
    for (const f of targetFriends) {
      const friendId = f.userId1 === args.targetUserId ? f.userId2 : f.userId1;

      if (
        friendId !== current._id &&
        friendId !== args.targetUserId &&
        currentFriendIds.has(friendId)
      ) {
        mutualFriendIds.push(friendId);
      }
    }

    const totalCommonFriends = mutualFriendIds.length;
    const limitedFriendIds = args.friendsLimit
      ? mutualFriendIds.slice(0, args.friendsLimit)
      : mutualFriendIds;

    const friendUsers = await Promise.all(
      limitedFriendIds.map(id => ctx.db.get(id)),
    );

    const friends = friendUsers.filter((u): u is NonNullable<typeof u> =>
      Boolean(u),
    );
    const currentServers = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', current._id))
      .collect();

    const targetServers = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .collect();

    const currentServerIds = new Set(currentServers.map(m => m.serverId));
    const mutualServerIds: Id<'servers'>[] = [];

    for (const m of targetServers) {
      if (currentServerIds.has(m.serverId)) {
        mutualServerIds.push(m.serverId);
      }
    }

    const totalCommonServers = mutualServerIds.length;
    const limitedServerIds = args.serversLimit
      ? mutualServerIds.slice(0, args.serversLimit)
      : mutualServerIds;

    const serverDocs = await Promise.all(
      limitedServerIds.map(id => ctx.db.get(id)),
    );

    const servers = serverDocs.filter((s): s is NonNullable<typeof s> =>
      Boolean(s),
    );
    return {
      commonFriends: totalCommonFriends,
      commonServers: totalCommonServers,
      friends,
      servers,
    };
  },
});
