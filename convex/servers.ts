import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getUserServers = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return [];

    const memberships = await ctx.db
      .query('serverMembers')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .filter(q => q.eq(q.field('isBanned'), false))
      .collect();

    const servers = await Promise.all(
      memberships.map(async membership => {
        const server = await ctx.db.get(membership.serverId);
        if (!server) return null;

        return {
          ...server,
          role: membership.role,
          nickname: membership.nickname,
        };
      }),
    );

    return servers.filter(
      (server): server is NonNullable<typeof server> => server !== null,
    );
  },
});

// Get server by ID with member check
export const getServerById = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    const server = await ctx.db.get(args.serverId);
    if (!server) return null;

    // Check if user is a member
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    return {
      ...server,
      role: membership.role,
      nickname: membership.nickname,
    };
  },
});

// Get server members
export const getServerMembers = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return [];

    // Check if user is a member of this server
    const userMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!userMembership || userMembership.isBanned) return [];

    // Get all members
    const members = await ctx.db
      .query('serverMembers')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .filter(q => q.eq(q.field('isBanned'), false))
      .collect();

    // Get user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async member => {
        const memberUser = await ctx.db.get(member.userId);
        if (!memberUser) return null;

        return {
          ...member,
          user: {
            _id: memberUser._id,
            username: memberUser.username,
            displayName: memberUser.displayName,
            discriminator: memberUser.discriminator,
            avatarUrl: memberUser.avatarUrl,
            status: memberUser.status,
          },
        };
      }),
    );

    // Type-safe filter to remove null values
    return membersWithUsers.filter(
      (member): member is NonNullable<typeof member> => member !== null,
    );
  },
});

// Create a new server
export const createServer = mutation({
  args: {
    name: v.string(),
    iconUrl: v.optional(v.string()),
    iconStorageId: v.optional(v.id('_storage')),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const inviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    let iconUrl = args.iconUrl;
    if (!iconUrl && args.iconStorageId) {
      iconUrl = (await ctx.storage.getUrl(args.iconStorageId)) ?? undefined;
    }

    const serverId = await ctx.db.insert('servers', {
      name: args.name,
      description: '',
      iconUrl,
      iconStorageId: args.iconStorageId,
      ownerId: user._id,
      inviteCode,
      isPublic: args.isPublic ?? false,
      memberCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add owner as member
    await ctx.db.insert('serverMembers', {
      serverId,
      userId: user._id,
      role: 'owner',
      joinedAt: Date.now(),
      isMuted: false,
      isDeafened: false,
      isBanned: false,
    });

    // Create default channels
    const generalCategoryId = await ctx.db.insert('channelCategories', {
      serverId,
      name: 'General',
      position: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert('channels', {
      serverId,
      categoryId: generalCategoryId,
      name: 'general',
      type: 'text',
      position: 0,
      isPrivate: false,
      isNsfw: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert('channels', {
      serverId,
      categoryId: generalCategoryId,
      name: 'General',
      type: 'voice',
      position: 1,
      isPrivate: false,
      isNsfw: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { serverId, inviteCode };
  },
});

export const updateServer = mutation({
  args: {
    serverId: v.id('servers'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    iconStorageId: v.optional(v.id('_storage')),
    bannerUrl: v.optional(v.string()),
    bannerStorageId: v.optional(v.id('_storage')),
    isPublic: v.optional(v.boolean()),
    vanityUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    const { serverId, ...updates } = args;

    const finalUpdates: Partial<typeof server> = {};

    if (updates.iconStorageId !== undefined) {
      if (
        server.iconStorageId &&
        server.iconStorageId !== updates.iconStorageId
      ) {
        try {
          await ctx.storage.delete(server.iconStorageId);
        } catch (error) {
          console.error('Failed to delete old icon:', error);
        }
      }

      finalUpdates.iconStorageId = updates.iconStorageId;
      if (!updates.iconUrl && updates.iconStorageId) {
        finalUpdates.iconUrl =
          (await ctx.storage.getUrl(updates.iconStorageId)) ?? undefined;
      } else {
        finalUpdates.iconUrl = updates.iconUrl;
      }
    }

    if (updates.bannerStorageId !== undefined) {
      if (
        server.bannerStorageId &&
        server.bannerStorageId !== updates.bannerStorageId
      ) {
        try {
          await ctx.storage.delete(server.bannerStorageId);
        } catch (error) {
          console.error('Failed to delete old banner:', error);
        }
      }

      finalUpdates.bannerStorageId = updates.bannerStorageId;
      if (!updates.bannerUrl && updates.bannerStorageId) {
        finalUpdates.bannerUrl =
          (await ctx.storage.getUrl(updates.bannerStorageId)) ?? undefined;
      } else {
        finalUpdates.bannerUrl = updates.bannerUrl;
      }
    }

    if (updates.name !== undefined) finalUpdates.name = updates.name;
    if (updates.description !== undefined)
      finalUpdates.description = updates.description;
    if (updates.isPublic !== undefined)
      finalUpdates.isPublic = updates.isPublic;
    if (updates.vanityUrl !== undefined)
      finalUpdates.vanityUrl = updates.vanityUrl;

    await ctx.db.patch(serverId, {
      ...finalUpdates,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      iconUrl: finalUpdates.iconUrl,
      bannerUrl: finalUpdates.bannerUrl,
    };
  },
});

export const deleteServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

    // Only owner can delete server
    if (server.ownerId !== user._id) {
      throw new Error('Only server owner can delete the server');
    }

    // Delete all related data
    const members = await ctx.db
      .query('serverMembers')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    // Delete members
    await Promise.all(members.map(member => ctx.db.delete(member._id)));

    // Delete channels and their messages
    await Promise.all(
      channels.map(async channel => {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_channel', q => q.eq('channelId', channel._id))
          .collect();

        await Promise.all(messages.map(msg => ctx.db.delete(msg._id)));
        await ctx.db.delete(channel._id);
      }),
    );

    // Delete categories
    await Promise.all(categories.map(cat => ctx.db.delete(cat._id)));

    // Delete server icons/banners from storage
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

    await ctx.db.delete(args.serverId);

    return { success: true };
  },
});

// Join server by invite code
export const joinServer = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    // Find server by invite code
    const server = await ctx.db
      .query('servers')
      .withIndex('by_invite_code', q => q.eq('inviteCode', args.inviteCode))
      .first();

    if (!server) throw new Error('Invalid invite code');

    // Check if already a member
    const existingMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', server._id).eq('userId', user._id),
      )
      .first();

    if (existingMembership && !existingMembership.isBanned) {
      throw new Error('Already a member of this server');
    }

    if (existingMembership && existingMembership.isBanned) {
      throw new Error('You are banned from this server');
    }

    // Add as member
    await ctx.db.insert('serverMembers', {
      serverId: server._id,
      userId: user._id,
      role: 'member',
      joinedAt: Date.now(),
      isMuted: false,
      isDeafened: false,
      isBanned: false,
    });

    // Update member count
    await ctx.db.patch(server._id, {
      memberCount: server.memberCount + 1,
      updatedAt: Date.now(),
    });

    return { serverId: server._id, serverName: server.name };
  },
});

// Leave server
export const leaveServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

    // Owner cannot leave, must transfer ownership or delete server
    if (server.ownerId === user._id) {
      throw new Error(
        'Server owner cannot leave. Transfer ownership or delete the server.',
      );
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership) throw new Error('Not a member of this server');

    // Delete membership
    await ctx.db.delete(membership._id);

    // Update member count
    await ctx.db.patch(args.serverId, {
      memberCount: Math.max(0, server.memberCount - 1),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Regenerate invite code
export const regenerateInviteCode = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

    // Check if user is owner or admin
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    const newInviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    await ctx.db.patch(args.serverId, {
      inviteCode: newInviteCode,
      updatedAt: Date.now(),
    });

    return { inviteCode: newInviteCode };
  },
});
