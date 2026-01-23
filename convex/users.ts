/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { UserStatus } from './schema';

export const currentUser = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);

    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    return user;
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', data.id))
      .first();

    const primaryEmail = data.email_addresses?.find(
      (e: any) => e.id === data.primary_email_address_id,
    );

    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') ||
      data.username ||
      '';

    // Generate discriminator (random 4 digits) for new users
    const discriminator =
      existingUser?.discriminator ||
      Math.floor(1000 + Math.random() * 9000).toString();

    const userData = {
      clerkId: data.id,
      email: primaryEmail?.email_address ?? '',
      username: data.username ?? '',
      displayName,
      discriminator,
      avatarUrl: data.image_url,
      emailVerified: primaryEmail?.verification?.status === 'verified',
      status: 'online' as UserStatus,
      lastSeen: Date.now(),
      ...existingUser,
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
    } else {
      const newUserId = await ctx.db.insert('users', userData);

      await ctx.db.insert('userSettings', {
        userId: newUserId,
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
      });
    }
  },
});

export const updateUser = mutation({
  args: {
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(UserStatus),
    customStatus: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    bannerUrl: v.optional(v.string()),
    bannerStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

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

    if (user) {
      const settings = await ctx.db
        .query('userSettings')
        .withIndex('by_user', q => q.eq('userId', user._id))
        .first();

      if (settings) {
        await ctx.db.delete(settings._id);
      }

      if (user.avatarStorageId) {
        try {
          await ctx.storage.delete(user.avatarStorageId);
          console.log(`Deleted avatar for user ${user.email}`);
        } catch (error) {
          console.error('Failed to delete avatar:', error);
        }
      }

      if (user.bannerStorageId) {
        try {
          await ctx.storage.delete(user.bannerStorageId);
          console.log(`Deleted banner for user ${user.email}`);
        } catch (error) {
          console.error('Failed to delete banner:', error);
        }
      }

      await ctx.db.delete(user._id);
      console.log(`User ${user.email} permanently deleted`);
    }
  },
});

export const getUserSettings = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

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

    await ctx.db.patch(settings._id, updates);

    return { success: true };
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return;

    const isManualOffline = user.status === 'offline' && user.customStatus;
    const shouldUpdateToOnline =
      !user.status || (user.status === 'offline' && !isManualOffline);

    await ctx.db.patch(user._id, {
      ...(shouldUpdateToOnline && { status: 'online' }),
      lastSeen: Date.now(),
    });
  },
});

export const updatePresence = mutation({
  args: {
    status: UserStatus,
    customStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, {
      status: args.status,
      customStatus: args.customStatus,
      lastSeen: Date.now(),
    });

    return { success: true };
  },
});

// Auto-update to busy when in call/meeting
export const setUserBusy = mutation({
  args: {
    callId: v.optional(v.id('calls')),
    meetingId: v.optional(v.id('meetings')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return;

    await ctx.db.patch(user._id, {
      status: 'busy',
      customStatus: args.callId ? 'In a call' : 'In a meeting',
      lastSeen: Date.now(),
    });
  },
});

// Auto-update to online when call/meeting ends
export const setUserAvailable = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return;

    // Only update if currently busy
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
