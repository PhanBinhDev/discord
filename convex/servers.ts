import { getAuthUserId } from '@convex-dev/auth/server';
import { GenericQueryCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { mutation } from './functions';

const EXPIRED_TIME = 7 * 24 * 60 * 60 * 1000;

async function canUserAccessChannel(
  ctx: GenericQueryCtx<DataModel>,
  userId: Id<'users'>,
  channelId: Id<'channels'>,
  serverId: Id<'servers'>,
): Promise<boolean> {
  const channel = await ctx.db.get(channelId);
  if (!channel) return false;

  if (!channel.isPrivate) return true;

  const membership = await ctx.db
    .query('serverMembers')
    .withIndex('by_server_user', q =>
      q.eq('serverId', serverId).eq('userId', userId),
    )
    .first();

  if (!membership || membership.isBanned) return false;

  if (membership.role === 'owner' || membership.role === 'admin') {
    return true;
  }

  const userPermission = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channelId))
    .filter(q => q.eq(q.field('userId'), userId))
    .first();

  if (userPermission) {
    return userPermission.canView;
  }

  const userRoles = await ctx.db
    .query('userRoles')
    .withIndex('by_user_server', q =>
      q.eq('userId', userId).eq('serverId', serverId),
    )
    .collect();

  if (userRoles.length === 0) return false;

  const rolePermissions = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channelId))
    .collect();

  for (const userRole of userRoles) {
    const permission = rolePermissions.find(p => p.roleId === userRole.roleId);
    if (permission && permission.canView) {
      return true;
    }
  }

  return false;
}

export const inviteUserToServer = mutation({
  args: {
    serverId: v.id('servers'),
    targetUserId: v.id('users'),
    inviteMessage: v.optional(v.string()),
    options: v.optional(
      v.object({
        expiresAt: v.optional(v.number()),
        maxUses: v.optional(v.number()),
        temporary: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!currentUser) throw new Error('User not found');

    const inviteMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', currentUser._id),
      )
      .first();

    if (!inviteMembership) {
      throw new Error('You are not a member of the server');
    }

    const targetMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', args.targetUserId),
      )
      .first();

    if (targetMembership) {
      throw new Error('User is already a member of the server');
    }

    const server = await ctx.db.get(args.serverId);

    if (!server) throw new Error('Server not found');

    const targetUser = await ctx.db.get(args.targetUserId);

    if (!targetUser) throw new Error('Target user not found');

    const friendship = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', currentUser._id).eq('userId2', args.targetUserId),
      )
      .first();

    const reverseFriendship = await ctx.db
      .query('friends')
      .withIndex('by_users', q =>
        q.eq('userId1', args.targetUserId).eq('userId2', currentUser._id),
      )
      .first();

    const areFriends =
      friendship?.status === 'accepted' ||
      reverseFriendship?.status === 'accepted';

    const targetSettings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', q => q.eq('userId', args.targetUserId))
      .first();

    const inviteCode = generateInviteCode();

    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    await ctx.db.insert('serverInvites', {
      serverId: args.serverId,
      channelId: channels[0]._id,
      inviterId: currentUser._id,
      code: inviteCode,
      uses: 0,
      maxUses: args.options?.maxUses || 1,
      temporary: args.options?.temporary || false,
      status: 'active',
      expiresAt: args.options?.expiresAt || Date.now() + EXPIRED_TIME,
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteCode}`;

    if (areFriends) {
      await ctx.db.insert('directMessages', {
        senderId: currentUser._id,
        receiverId: args.targetUserId,
        content:
          args.inviteMessage ||
          `Hey! Join me on **${server.name}**!\n\n${inviteLink}`,
        type: 'text',
        isRead: false,
        createdAt: Date.now(),
      });

      // Send notification
      await ctx.db.insert('notifications', {
        userId: args.targetUserId,
        type: 'server_invite',
        title: 'Server Invitation',
        message: `${currentUser.displayName} invited you to join ${server.name}`,
        metadata: {
          serverId: args.serverId,
          inviteCode,
          inviterId: currentUser._id,
        },
        read: false,
      });

      return {
        success: true,
        method: 'direct_message',
        inviteCode,
      };
    }

    const canSendDM =
      targetSettings?.privacy?.dmPermission === 'everyone' ||
      (targetSettings?.privacy?.dmPermission === 'server_members' &&
        (await areInSameServer(ctx, currentUser._id, args.targetUserId)));

    if (canSendDM) {
      await ctx.db.insert('directMessages', {
        senderId: currentUser._id,
        receiverId: args.targetUserId,
        content:
          args.inviteMessage ||
          `Hey! Join me on **${server.name}**!\n\n${inviteLink}`,
        type: 'text',
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert('notifications', {
        userId: args.targetUserId,
        type: 'server_invite_request',
        title: 'Server Invitation Request',
        message: `${currentUser.displayName} sent you a server invitation`,
        metadata: {
          serverId: args.serverId,
          inviteCode,
          inviterId: currentUser._id,
        },
        read: false,
      });

      return {
        success: true,
        method: 'message_request',
        inviteCode,
      };
    }

    await ctx.db.insert('notifications', {
      userId: args.targetUserId,
      type: 'server_invite_pending',
      title: 'Pending Server Invitation',
      message: `${currentUser.displayName} wants to invite you to ${server.name}`,
      metadata: {
        serverId: args.serverId,
        inviteCode,
        inviterId: currentUser._id,
      },
      read: false,
    });

    return {
      success: true,
      method: 'notification_only',
      inviteCode,
      message: 'Invitation sent. User will see it in their notifications.',
    };
  },
});

async function areInSameServer(
  ctx: GenericQueryCtx<DataModel>,
  userId1: Id<'users'>,
  userId2: Id<'users'>,
) {
  const user1Servers = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', userId1))
    .collect();

  const user2Servers = await ctx.db
    .query('serverMembers')
    .withIndex('by_user', q => q.eq('userId', userId2))
    .collect();

  const user1ServerIds = new Set(user1Servers.map(m => m.serverId));

  return user2Servers.some(m => user1ServerIds.has(m.serverId));
}

function generateInviteCode(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const getAccessibleChannels = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    const allChannels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .order('asc')
      .collect();

    const accessibleChannels: Doc<'channels'>[] = [];
    for (const channel of allChannels) {
      const hasAccess = await canUserAccessChannel(
        ctx,
        user._id,
        channel._id,
        args.serverId,
      );
      if (hasAccess) {
        accessibleChannels.push(channel);
      }
    }

    if (accessibleChannels.length === 0) return null;

    // Lấy channel cuối cùng user xem
    const lastViewed = await ctx.db
      .query('userLastViewedChannels')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .first();

    let defaultChannel: Doc<'channels'> | null = null;

    if (lastViewed) {
      const lastViewedChannel = accessibleChannels.find(
        ch => ch._id === lastViewed.channelId,
      );
      if (lastViewedChannel) {
        defaultChannel = lastViewedChannel;
      }
    }

    if (!defaultChannel) {
      defaultChannel =
        accessibleChannels.find(
          ch => ch.name.toLowerCase() === 'general' && ch.type === 'text',
        ) || accessibleChannels[0];
    }

    return {
      channels: accessibleChannels,
      defaultChannelId: defaultChannel._id,
    };
  },
});

export const updateLastViewedChannel = mutation({
  args: {
    serverId: v.id('servers'),
    channelId: v.id('channels'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const hasAccess = await canUserAccessChannel(
      ctx,
      user._id,
      args.channelId,
      args.serverId,
    );

    if (!hasAccess) {
      throw new Error('No access to this channel');
    }

    // Tìm record hiện tại
    const existing = await ctx.db
      .query('userLastViewedChannels')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .first();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        channelId: args.channelId,
        lastViewedAt: Date.now(),
      });
    } else {
      // Insert
      await ctx.db.insert('userLastViewedChannels', {
        userId: user._id,
        serverId: args.serverId,
        channelId: args.channelId,
        lastViewedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const setChannelPermission = mutation({
  args: {
    channelId: v.id('channels'),
    roleId: v.optional(v.id('roles')),
    userId: v.optional(v.id('users')),
    canView: v.boolean(),
    canSend: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', authUserId))
      .first();

    if (!user) throw new Error('User not found');

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error('Channel not found');

    // Kiểm tra quyền admin
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    // Tìm permission hiện tại
    let existingPermission;
    if (args.roleId) {
      existingPermission = await ctx.db
        .query('channelPermissions')
        .withIndex('by_channel_role', q =>
          q.eq('channelId', args.channelId).eq('roleId', args.roleId),
        )
        .first();
    } else if (args.userId) {
      existingPermission = await ctx.db
        .query('channelPermissions')
        .withIndex('by_channel', q => q.eq('channelId', args.channelId))
        .filter(q => q.eq(q.field('userId'), args.userId))
        .first();
    }

    if (existingPermission) {
      await ctx.db.patch(existingPermission._id, {
        canView: args.canView,
        canSend: args.canSend,
      });
    } else {
      await ctx.db.insert('channelPermissions', {
        channelId: args.channelId,
        roleId: args.roleId,
        userId: args.userId,
        canView: args.canView,
        canSend: args.canSend,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const removeChannelPermission = mutation({
  args: {
    permissionId: v.id('channelPermissions'),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', authUserId))
      .first();

    if (!user) throw new Error('User not found');

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error('Permission not found');

    const channel = await ctx.db.get(permission.channelId);
    if (!channel) throw new Error('Channel not found');

    // Kiểm tra quyền admin
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    await ctx.db.delete(args.permissionId);

    return { success: true };
  },
});

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

    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    return {
      ...server,
      role: membership.role,
      nickname: membership.nickname,
      channels,
    };
  },
});

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
