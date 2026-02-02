/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthUserId } from '@convex-dev/auth/server';
import { GenericQueryCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { mutation } from './functions';
import { ChannelType } from './schema';

const EXPIRED_TIME = 7 * 24 * 60 * 60 * 1000;

async function canUserAccessChannel(
  ctx: GenericQueryCtx<DataModel>,
  userId: Id<'users'>,
  channelId: Id<'channels'>,
  serverId: Id<'servers'>,
): Promise<boolean> {
  const channel = await ctx.db.get(channelId);
  if (!channel) return false;

  const membership = await ctx.db
    .query('serverMembers')
    .withIndex('by_server_user', q =>
      q.eq('serverId', serverId).eq('userId', userId),
    )
    .first();

  if (!membership || membership.isBanned) return false;

  // Owner và admin có full access
  if (membership.role === 'owner' || membership.role === 'admin') {
    return true;
  }

  // Nếu channel thuộc category, kiểm tra category permissions trước
  if (channel.categoryId) {
    const category = await ctx.db.get(channel.categoryId);

    if (category && category.isPrivate) {
      // Category private → phải check permissions
      const userRoles = await ctx.db
        .query('userRoles')
        .withIndex('by_user_server', q =>
          q.eq('userId', userId).eq('serverId', serverId),
        )
        .collect();

      // Lấy @everyone role
      const everyoneRole = await ctx.db
        .query('roles')
        .withIndex('by_server', q => q.eq('serverId', serverId))
        .filter(q => q.eq(q.field('isDefault'), true))
        .first();

      const allUserRoleIds = [
        ...userRoles.map(ur => ur.roleId),
        ...(everyoneRole ? [everyoneRole._id] : []),
      ];

      // Check category permissions
      const categoryPermissions = await ctx.db
        .query('categoryPermissions')
        .withIndex('by_category', q => q.eq('categoryId', channel.categoryId!))
        .collect();

      const hasAccessToCategory = categoryPermissions.some(
        perm => allUserRoleIds.includes(perm.roleId) && perm.canView,
      );

      if (!hasAccessToCategory) return false;
    }
  }

  // Nếu channel không private, và đã pass category check → OK
  if (!channel.isPrivate) return true;

  // Channel private → kiểm tra channel permissions
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

    // Get all categories
    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const categoryMap = new Map(categories.map(cat => [cat._id, cat]));

    // Get user's roles
    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .collect();

    // Get role details
    const roles = await Promise.all(
      userRoles.map(async ur => {
        const role = await ctx.db.get(ur.roleId);
        return role;
      }),
    );

    const validRoles = roles.filter((r): r is Doc<'roles'> => r !== null);

    // Get all channels
    const allChannels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const accessibleChannels: Array<
      Doc<'channels'> & {
        category: Doc<'channelCategories'> | null;
        permissions: {
          canView: boolean;
          canSend: boolean;
          canManage: boolean;
          canDelete: boolean;
        };
      }
    > = [];

    for (const channel of allChannels) {
      const permissions = await getUserChannelPermissions(
        ctx,
        user._id,
        channel._id,
        args.serverId,
      );

      if (permissions.canView) {
        const category = channel.categoryId
          ? categoryMap.get(channel.categoryId) || null
          : null;

        accessibleChannels.push({
          ...channel,
          category,
          permissions,
        });
      }
    }

    if (accessibleChannels.length === 0) return null;

    const lastViewed = await ctx.db
      .query('userLastViewedChannels')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .first();

    let defaultChannel = null;

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
      userMembership: {
        role: membership.role,
        nickname: membership.nickname,
        isMuted: membership.isMuted,
        isDeafened: membership.isDeafened,
        joinedAt: membership.joinedAt,
      },
      userRoles: validRoles.map(role => ({
        _id: role._id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions,
      })),
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

    // Nếu channel thuộc category private, kiểm tra xem role có được phép ở category không
    if (channel.categoryId && args.roleId) {
      const category = await ctx.db.get(channel.categoryId);

      if (category && category.isPrivate) {
        const categoryPerms = await ctx.db
          .query('categoryPermissions')
          .withIndex('by_category', q =>
            q.eq('categoryId', channel.categoryId!),
          )
          .collect();

        const roleHasAccessToCategory = categoryPerms.some(
          perm => perm.roleId === args.roleId && perm.canView,
        );

        // Không cho phép thêm role vào channel nếu role đó không có quyền ở category
        if (!roleHasAccessToCategory) {
          throw new Error(
            'Cannot grant channel access to role that does not have access to the parent category',
          );
        }
      }
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

export const setCategoryPermission = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    roleId: v.id('roles'),
    canView: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', authUserId))
      .first();

    if (!user) throw new Error('User not found');

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found');

    // Kiểm tra quyền admin
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    // Tìm permission hiện tại
    const existingPermission = await ctx.db
      .query('categoryPermissions')
      .withIndex('by_category_role', q =>
        q.eq('categoryId', args.categoryId).eq('roleId', args.roleId),
      )
      .first();

    if (existingPermission) {
      await ctx.db.patch(existingPermission._id, {
        canView: args.canView,
      });
    } else {
      await ctx.db.insert('categoryPermissions', {
        categoryId: args.categoryId,
        roleId: args.roleId,
        canView: args.canView,
      });
    }

    return { success: true };
  },
});

export const removeCategoryPermission = mutation({
  args: {
    permissionId: v.id('categoryPermissions'),
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

    const category = await ctx.db.get(permission.categoryId);
    if (!category) throw new Error('Category not found');

    // Kiểm tra quyền admin
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', user._id),
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

    // Get all categories for this server
    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    // Get all channels for this server
    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    // Map category into each channel
    const channelsWithCategory = channels.map(channel => {
      const category =
        categories.find(cat => cat._id === channel.categoryId) || null;
      return {
        ...channel,
        category,
      };
    });

    return {
      ...server,
      role: membership.role,
      nickname: membership.nickname,
      channels: channelsWithCategory,
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

    // Create default @everyone role
    const everyoneRoleId = await ctx.db.insert('roles', {
      serverId,
      name: '@everyone',
      color: undefined,
      position: 0,
      permissions: 0, // No special permissions
      isHoisted: false,
      isMentionable: false,
      isDefault: true,
    });

    const generalCategoryId = await ctx.db.insert('channelCategories', {
      serverId,
      name: 'Text Channels',
      position: 0,
      isPrivate: false,
    });

    const voiceCategoryId = await ctx.db.insert('channelCategories', {
      serverId,
      name: 'Voice Channels',
      position: 1,
      isPrivate: false,
    });

    // Grant @everyone access to both categories
    await ctx.db.insert('categoryPermissions', {
      categoryId: generalCategoryId,
      roleId: everyoneRoleId,
      canView: true,
    });

    await ctx.db.insert('categoryPermissions', {
      categoryId: voiceCategoryId,
      roleId: everyoneRoleId,
      canView: true,
    });

    await ctx.db.insert('channels', {
      serverId,
      categoryId: generalCategoryId,
      name: 'general',
      type: 'text',
      position: 0,
      isPrivate: false,
      isNsfw: false,
      updatedAt: Date.now(),
    });

    await ctx.db.insert('channels', {
      serverId,
      categoryId: voiceCategoryId,
      name: 'General',
      type: 'voice',
      position: 1,
      isPrivate: false,
      isNsfw: false,
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

export const createCategory = mutation({
  args: {
    serverId: v.id('servers'),
    name: v.string(),
    position: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    roleIds: v.optional(v.array(v.id('roles'))), // Roles được phép truy cập nếu private
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

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

    let position = args.position;
    if (position === undefined) {
      const categories = await ctx.db
        .query('channelCategories')
        .withIndex('by_server', q => q.eq('serverId', args.serverId))
        .collect();
      position = categories.length;
    }

    const categoryId = await ctx.db.insert('channelCategories', {
      serverId: args.serverId,
      name: args.name,
      position,
      isPrivate: args.isPrivate ?? false,
    });

    // Nếu category là private và có roleIds, tạo permissions
    if (args.isPrivate && args.roleIds && args.roleIds.length > 0) {
      await Promise.all(
        args.roleIds.map(roleId =>
          ctx.db.insert('categoryPermissions', {
            categoryId,
            roleId,
            canView: true,
          }),
        ),
      );
    }

    // Nếu category là public, gán cho @everyone role
    if (!args.isPrivate) {
      const everyoneRole = await ctx.db
        .query('roles')
        .withIndex('by_server', q => q.eq('serverId', args.serverId))
        .filter(q => q.eq(q.field('isDefault'), true))
        .first();

      if (everyoneRole) {
        await ctx.db.insert('categoryPermissions', {
          categoryId,
          roleId: everyoneRole._id,
          canView: true,
        });
      }
    }

    return { categoryId };
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    name: v.optional(v.string()),
    position: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found');

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.position !== undefined) updates.position = args.position;

    await ctx.db.patch(args.categoryId, updates);

    return { success: true };
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    deleteChannels: v.optional(v.boolean()), // true = delete channels, false = move to uncategorized
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found');

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    const channels = await ctx.db
      .query('channels')
      .withIndex('by_category', q => q.eq('categoryId', args.categoryId))
      .collect();

    if (args.deleteChannels) {
      for (const channel of channels) {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_channel', q => q.eq('channelId', channel._id))
          .collect();

        await Promise.all(messages.map(msg => ctx.db.delete(msg._id)));
        await ctx.db.delete(channel._id);
      }
    } else {
      await Promise.all(
        channels.map(channel =>
          ctx.db.patch(channel._id, { categoryId: undefined }),
        ),
      );
    }

    await ctx.db.delete(args.categoryId);

    return { success: true };
  },
});

export const reorderCategories = mutation({
  args: {
    serverId: v.id('servers'),
    categoryOrders: v.array(
      v.object({
        categoryId: v.id('channelCategories'),
        position: v.number(),
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

    // Check permissions
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

    // Update positions
    await Promise.all(
      args.categoryOrders.map(({ categoryId, position }) =>
        ctx.db.patch(categoryId, { position }),
      ),
    );

    return { success: true };
  },
});

export const createChannel = mutation({
  args: {
    serverId: v.id('servers'),
    categoryId: v.optional(v.id('channelCategories')),
    name: v.string(),
    type: ChannelType,
    topic: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    isNsfw: v.optional(v.boolean()),
    position: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

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

    let position = args.position;
    if (position === undefined) {
      const channels = await ctx.db
        .query('channels')
        .withIndex('by_server', q => q.eq('serverId', args.serverId))
        .collect();
      position = channels.length;
    }

    // Nếu channel được tạo trong category private, channel phải là private
    let isPrivate = args.isPrivate ?? false;
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (category && category.isPrivate) {
        isPrivate = true; // Force private nếu category là private
      }
    }

    const channelId = await ctx.db.insert('channels', {
      serverId: args.serverId,
      categoryId: args.categoryId,
      name: args.name,
      type: args.type,
      topic: args.topic,
      position,
      isPrivate,
      isNsfw: args.isNsfw ?? false,
      updatedAt: Date.now(),
    });

    // Nếu category private, kế thừa permissions từ category
    if (args.categoryId && isPrivate) {
      const categoryPerms = await ctx.db
        .query('categoryPermissions')
        .withIndex('by_category', q => q.eq('categoryId', args.categoryId!))
        .collect();

      // Tạo channel permissions tương ứng
      await Promise.all(
        categoryPerms.map(perm =>
          ctx.db.insert('channelPermissions', {
            channelId,
            roleId: perm.roleId,
            userId: undefined,
            canView: perm.canView,
            canSend: true, // Mặc định cho phép gửi tin nhắn nếu được xem
          }),
        ),
      );
    }

    return { channelId };
  },
});

export const updateChannel = mutation({
  args: {
    channelId: v.id('channels'),
    name: v.optional(v.string()),
    topic: v.optional(v.string()),
    categoryId: v.optional(v.union(v.id('channelCategories'), v.null())),
    position: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    isNsfw: v.optional(v.boolean()),
    slowMode: v.optional(v.number()),
    userLimit: v.optional(v.number()),
    bitrate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error('Channel not found');

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

    const { channelId, ...updates } = args;
    const finalUpdates: any = { updatedAt: Date.now() };

    if (updates.name !== undefined) finalUpdates.name = updates.name;
    if (updates.topic !== undefined) finalUpdates.topic = updates.topic;
    if (updates.categoryId !== undefined) {
      finalUpdates.categoryId =
        updates.categoryId === null ? undefined : updates.categoryId;
    }
    if (updates.position !== undefined)
      finalUpdates.position = updates.position;
    if (updates.isPrivate !== undefined)
      finalUpdates.isPrivate = updates.isPrivate;
    if (updates.isNsfw !== undefined) finalUpdates.isNsfw = updates.isNsfw;
    if (updates.slowMode !== undefined)
      finalUpdates.slowMode = updates.slowMode;
    if (updates.userLimit !== undefined)
      finalUpdates.userLimit = updates.userLimit;
    if (updates.bitrate !== undefined) finalUpdates.bitrate = updates.bitrate;

    await ctx.db.patch(channelId, finalUpdates);

    return { success: true };
  },
});

export const deleteChannel = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error('Channel not found');

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

    // Delete all messages in channel
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .collect();

    await Promise.all(messages.map(msg => ctx.db.delete(msg._id)));

    const permissions = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .collect();

    await Promise.all(permissions.map(perm => ctx.db.delete(perm._id)));

    await ctx.db.delete(args.channelId);

    return { success: true };
  },
});

export const reorderChannels = mutation({
  args: {
    serverId: v.id('servers'),
    channelOrders: v.array(
      v.object({
        channelId: v.id('channels'),
        position: v.number(),
        categoryId: v.optional(v.union(v.id('channelCategories'), v.null())),
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

    await Promise.all(
      args.channelOrders.map(({ channelId, position, categoryId }) => {
        const updates: any = { position, updatedAt: Date.now() };
        if (categoryId !== undefined) {
          updates.categoryId = categoryId === null ? undefined : categoryId;
        }
        return ctx.db.patch(channelId, updates);
      }),
    );

    return { success: true };
  },
});

export const moveChannel = mutation({
  args: {
    channelId: v.id('channels'),
    newCategoryId: v.union(v.id('channelCategories'), v.null()),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error('Channel not found');

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

    const oldCategoryId = channel.categoryId;
    const newCategoryId =
      args.newCategoryId === null ? undefined : args.newCategoryId;

    const targetChannels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', channel.serverId))
      .collect();

    const channelsInTargetCategory = targetChannels
      .filter(ch => {
        if (newCategoryId === undefined) {
          return ch.categoryId === undefined && ch._id !== args.channelId;
        }
        return ch.categoryId === newCategoryId && ch._id !== args.channelId;
      })
      .sort((a, b) => a.position - b.position);

    const updates: Array<Promise<any>> = [];

    updates.push(
      ctx.db.patch(args.channelId, {
        categoryId: newCategoryId,
        position: args.newPosition,
        updatedAt: Date.now(),
      }),
    );

    for (let i = 0; i < channelsInTargetCategory.length; i++) {
      const ch = channelsInTargetCategory[i];
      let newPos = i;

      if (i >= args.newPosition) {
        newPos = i + 1;
      }

      if (ch.position !== newPos) {
        updates.push(
          ctx.db.patch(ch._id, {
            position: newPos,
            updatedAt: Date.now(),
          }),
        );
      }
    }

    if (oldCategoryId !== newCategoryId) {
      const channelsInOldCategory = targetChannels
        .filter(ch => {
          if (oldCategoryId === undefined) {
            return ch.categoryId === undefined && ch._id !== args.channelId;
          }
          return ch.categoryId === oldCategoryId && ch._id !== args.channelId;
        })
        .sort((a, b) => a.position - b.position);

      channelsInOldCategory.forEach((ch, idx) => {
        if (ch.position !== idx) {
          updates.push(
            ctx.db.patch(ch._id, {
              position: idx,
              updatedAt: Date.now(),
            }),
          );
        }
      });
    }

    await Promise.all(updates);

    return { success: true };
  },
});

export const moveCategory = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) throw new Error('User not found');

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found');

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('Insufficient permissions');
    }

    const allCategories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', category.serverId))
      .collect();

    const otherCategories = allCategories
      .filter(c => c._id !== args.categoryId)
      .sort((a, b) => a.position - b.position);

    const updates: Array<Promise<any>> = [];

    updates.push(
      ctx.db.patch(args.categoryId, {
        position: args.newPosition,
      }),
    );

    for (let i = 0; i < otherCategories.length; i++) {
      const cat = otherCategories[i];
      let newPos = i;

      if (i >= args.newPosition) {
        newPos = i + 1;
      }

      if (cat.position !== newPos) {
        updates.push(
          ctx.db.patch(cat._id, {
            position: newPos,
          }),
        );
      }
    }

    await Promise.all(updates);

    return { success: true };
  },
});

// Get channel by ID with permissions check
export const getChannelById = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    // Check membership
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    // Check channel access
    if (channel.isPrivate) {
      // Owner/Admin always have access
      if (membership.role !== 'owner' && membership.role !== 'admin') {
        // Check specific permissions
        const hasPermission = await ctx.db
          .query('channelPermissions')
          .withIndex('by_channel', q => q.eq('channelId', args.channelId))
          .filter(q => q.eq(q.field('userId'), user._id))
          .first();

        if (!hasPermission || !hasPermission.canView) {
          // Check role permissions
          const userRoles = await ctx.db
            .query('userRoles')
            .withIndex('by_user_server', q =>
              q.eq('userId', user._id).eq('serverId', channel.serverId),
            )
            .collect();

          const rolePermissions = await ctx.db
            .query('channelPermissions')
            .withIndex('by_channel', q => q.eq('channelId', args.channelId))
            .collect();

          const hasRolePermission = userRoles.some(userRole =>
            rolePermissions.some(
              perm => perm.roleId === userRole.roleId && perm.canView,
            ),
          );

          if (!hasRolePermission) return null;
        }
      }
    }

    // Get category if exists
    const category = channel.categoryId
      ? await ctx.db.get(channel.categoryId)
      : null;

    return {
      ...channel,
      category,
    };
  },
});

export const getServerChannelsGrouped = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    // Check membership
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    // Get all categories
    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    // Get all channels
    const allChannels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    // Group channels by category
    const result = categories.map(category => {
      const categoryChannels = allChannels
        .filter(ch => ch.categoryId === category._id)
        .sort((a, b) => a.position - b.position);

      return {
        ...category,
        channels: categoryChannels,
      };
    });

    const uncategorizedChannels = allChannels
      .filter(ch => !ch.categoryId)
      .sort((a, b) => a.position - b.position);

    if (uncategorizedChannels.length > 0) {
      result.push({
        _id: 'uncategorized' as Id<'channelCategories'>,
        serverId: args.serverId,
        name: 'Uncategorized',
        position: 999,
        isPrivate: false,
        channels: uncategorizedChannels,
        _creationTime: new Date().getTime(),
      });
    }

    return result.sort((a, b) => a.position - b.position);
  },
});

export const getServerCategories = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first();

    if (!user) return null;

    // Check membership
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    // Get all categories sorted by position
    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    return categories.sort((a, b) => a.position - b.position);
  },
});

export const getChannelsByCategories = query({
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
      .collect();

    // Filter accessible channels
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

    // Group by category
    const grouped: Record<string, Doc<'channels'>[]> = {};
    const uncategorized: Doc<'channels'>[] = [];

    accessibleChannels.forEach(channel => {
      if (channel.categoryId) {
        const catId = channel.categoryId;
        if (!grouped[catId]) {
          grouped[catId] = [];
        }
        grouped[catId].push(channel);
      } else {
        uncategorized.push(channel);
      }
    });

    // Sort channels within each category
    Object.keys(grouped).forEach(catId => {
      grouped[catId].sort((a, b) => a.position - b.position);
    });

    uncategorized.sort((a, b) => a.position - b.position);

    return {
      categorized: grouped,
      uncategorized,
    };
  },
});

async function getUserChannelPermissions(
  ctx: GenericQueryCtx<DataModel>,
  userId: Id<'users'>,
  channelId: Id<'channels'>,
  serverId: Id<'servers'>,
): Promise<{
  canView: boolean;
  canSend: boolean;
  canManage: boolean; // Edit channel settings
  canDelete: boolean;
}> {
  const channel = await ctx.db.get(channelId);
  if (!channel) {
    return {
      canView: false,
      canSend: false,
      canManage: false,
      canDelete: false,
    };
  }

  const membership = await ctx.db
    .query('serverMembers')
    .withIndex('by_server_user', q =>
      q.eq('serverId', serverId).eq('userId', userId),
    )
    .first();

  if (!membership || membership.isBanned) {
    return {
      canView: false,
      canSend: false,
      canManage: false,
      canDelete: false,
    };
  }

  // Owner and Admin have all permissions
  if (membership.role === 'owner' || membership.role === 'admin') {
    return { canView: true, canSend: true, canManage: true, canDelete: true };
  }

  // For public channels, default permissions
  if (!channel.isPrivate) {
    return {
      canView: true,
      canSend: membership.role !== 'member' || !membership.isMuted,
      canManage: membership.role === 'moderator',
      canDelete: false,
    };
  }

  // For private channels, check specific permissions
  let canView = false;
  let canSend = false;

  // Check user-specific permission
  const userPermission = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channelId))
    .filter(q => q.eq(q.field('userId'), userId))
    .first();

  if (userPermission) {
    canView = userPermission.canView;
    canSend = userPermission.canSend;
  } else {
    // Check role-based permissions
    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user_server', q =>
        q.eq('userId', userId).eq('serverId', serverId),
      )
      .collect();

    const rolePermissions = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', channelId))
      .collect();

    for (const userRole of userRoles) {
      const permission = rolePermissions.find(
        p => p.roleId === userRole.roleId,
      );
      if (permission) {
        if (permission.canView) canView = true;
        if (permission.canSend) canSend = true;
      }
    }
  }

  return {
    canView,
    canSend: canSend && !membership.isMuted,
    canManage: membership.role === 'moderator',
    canDelete: false,
  };
}

// ==================== ADMIN UTILITIES ====================

export const clearAllData = mutation({
  args: {
    confirmationCode: v.string(), // Yêu cầu "DELETE_ALL_DATA" để xác nhận
  },
  handler: async (ctx, args) => {
    // Bảo vệ: chỉ cho phép nếu nhập đúng confirmation code
    if (args.confirmationCode !== 'DELETE_ALL_DATA') {
      throw new Error('Invalid confirmation code');
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized - Must be logged in');
    }

    console.log('🗑️  Starting database clear operation...');

    // Xóa theo thứ tự để tránh foreign key issues
    const tables = [
      'categoryPermissions',
      'channelPermissions',
      'userLastViewedChannels',
      'voiceChannelStates',
      'reactions',
      'messages',
      'directMessages',
      'channels',
      'channelCategories',
      'serverInvites',
      'serverBoosts',
      'serverCategoryMapping',
      'userRoles',
      'roles',
      'serverMembers',
      'servers',
      'reports',
      'webhooks',
      'eventLogs',
      'notifications',
      'friends',
      'userSettings',
      // Không xóa users để giữ authentication
    ];

    let totalDeleted = 0;

    for (const tableName of tables) {
      try {
        const records = await ctx.db.query(tableName as any).collect();
        await Promise.all(records.map(record => ctx.db.delete(record._id)));
        console.log(`✅ Deleted ${records.length} records from ${tableName}`);
        totalDeleted += records.length;
      } catch (error) {
        console.error(`❌ Error deleting from ${tableName}:`, error);
      }
    }

    console.log(`🎉 Database cleared! Total ${totalDeleted} records deleted`);

    return {
      success: true,
      totalDeleted,
      message: `Successfully deleted ${totalDeleted} records from ${tables.length} tables`,
    };
  },
});
