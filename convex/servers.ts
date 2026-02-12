/* eslint-disable @typescript-eslint/no-explicit-any */
import { GenericQueryCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { mutation } from './functions';
import { ChannelType } from './schema';
import { getCurrent, getCurrentUserOrThrow } from './users';

const EXPIRED_TIME = 7 * 24 * 60 * 60 * 1000;

async function canUserAccessChannelDirect(
  ctx: GenericQueryCtx<DataModel>,
  userId: Id<'users'>,
  channel: Doc<'channels'>,
  serverId: Id<'servers'>,
): Promise<boolean> {
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

  if (!channel.isPrivate) return true;

  const userPermission = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channel._id))
    .filter(q => q.eq(q.field('userId'), userId))
    .first();

  if (userPermission?.canView) {
    return true;
  }

  const userRoles = await ctx.db
    .query('userRoles')
    .withIndex('by_user_server', q =>
      q.eq('userId', userId).eq('serverId', serverId),
    )
    .collect();

  const everyoneRole = await ctx.db
    .query('roles')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .filter(q => q.eq(q.field('isDefault'), true))
    .first();

  const allRoleIds = [
    ...userRoles.map(ur => ur.roleId),
    ...(everyoneRole ? [everyoneRole._id] : []),
  ];

  const rolePermissions = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channel._id))
    .collect();

  for (const roleId of allRoleIds) {
    const permission = rolePermissions.find(p => p.roleId === roleId);
    if (permission?.canView) {
      return true;
    }
  }

  return false;
}

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

  if (membership.role === 'owner' || membership.role === 'admin') {
    return true;
  }

  // Check channel itself first - if channel is public, allow access
  // regardless of category permissions
  if (!channel.isPrivate) return true;

  // Channel is private - check category permission first if in category
  if (channel.categoryId) {
    const category = await ctx.db.get(channel.categoryId);

    if (category && category.isPrivate) {
      const userCategoryPerm = await ctx.db
        .query('categoryPermissions')
        .withIndex('by_category', q => q.eq('categoryId', channel.categoryId!))
        .filter(q => q.eq(q.field('userId'), userId))
        .first();

      if (userCategoryPerm) {
        if (!userCategoryPerm.canView) return false;
      } else {
        const userRoles = await ctx.db
          .query('userRoles')
          .withIndex('by_user_server', q =>
            q.eq('userId', userId).eq('serverId', serverId),
          )
          .collect();

        const everyoneRole = await ctx.db
          .query('roles')
          .withIndex('by_server', q => q.eq('serverId', serverId))
          .filter(q => q.eq(q.field('isDefault'), true))
          .first();

        const allUserRoleIds = [
          ...userRoles.map(ur => ur.roleId),
          ...(everyoneRole ? [everyoneRole._id] : []),
        ];

        const categoryPermissions = await ctx.db
          .query('categoryPermissions')
          .withIndex('by_category', q =>
            q.eq('categoryId', channel.categoryId!),
          )
          .collect();

        const hasAccessToCategory = categoryPermissions.some(
          perm =>
            perm.roleId && allUserRoleIds.includes(perm.roleId) && perm.canView,
        );

        if (!hasAccessToCategory) return false;
      }
    }
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

  const everyoneRole = await ctx.db
    .query('roles')
    .withIndex('by_server', q => q.eq('serverId', serverId))
    .filter(q => q.eq(q.field('isDefault'), true))
    .first();

  const allRoleIds = [
    ...userRoles.map(ur => ur.roleId),
    ...(everyoneRole ? [everyoneRole._id] : []),
  ];

  if (allRoleIds.length === 0) return false;
  const rolePermissions = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channelId))
    .collect();

  for (const roleId of allRoleIds) {
    const permission = rolePermissions.find(p => p.roleId === roleId);
    if (permission && permission.canView) {
      return true;
    }
  }

  return false;
}

// Replace the inviteUserToServer mutation (lines 195-368) with:

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
    const currentUser = await getCurrentUserOrThrow(ctx);

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

    // Send via conversation system if friends or can send DM
    if (areFriends) {
      // Get or create direct conversation
      const user1Conversations = await ctx.db
        .query('conversationMembers')
        .withIndex('by_user', q => q.eq('userId', currentUser._id))
        .collect();

      const user2Conversations = await ctx.db
        .query('conversationMembers')
        .withIndex('by_user', q => q.eq('userId', args.targetUserId))
        .collect();

      const user1ConvIds = new Set(user1Conversations.map(c => c.conversationId));
      const sharedConvMember = user2Conversations.find(c =>
        user1ConvIds.has(c.conversationId),
      );

      let conversationId: Id<'conversations'> | null = null;

      if (sharedConvMember) {
        const conversation = await ctx.db.get(sharedConvMember.conversationId);
        if (conversation?.type === 'direct' && conversation.isActive) {
          conversationId = conversation._id;
        }
      }

      // Create new conversation if not exists
      if (!conversationId) {
        conversationId = await ctx.db.insert('conversations', {
          type: 'direct',
          isActive: true,
          createdBy: currentUser._id,
          lastMessageAt: Date.now(),
        });

        await ctx.db.insert('conversationMembers', {
          conversationId,
          userId: currentUser._id,
          joinedAt: Date.now(),
          isMuted: false,
          isPinned: false,
        });

        await ctx.db.insert('conversationMembers', {
          conversationId,
          userId: args.targetUserId,
          joinedAt: Date.now(),
          isMuted: false,
          isPinned: false,
        });
      }

      // Send message
      await ctx.db.insert('conversationMessages', {
        conversationId,
        senderId: currentUser._id,
        content:
          args.inviteMessage ||
          `Hey! Join me on **${server.name}**!\n\n${inviteLink}`,
        type: 'text',
      });

      await ctx.db.patch(conversationId, {
        lastMessageAt: Date.now(),
      });

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
      // Get or create direct conversation
      const user1Conversations = await ctx.db
        .query('conversationMembers')
        .withIndex('by_user', q => q.eq('userId', currentUser._id))
        .collect();

      const user2Conversations = await ctx.db
        .query('conversationMembers')
        .withIndex('by_user', q => q.eq('userId', args.targetUserId))
        .collect();

      const user1ConvIds = new Set(user1Conversations.map(c => c.conversationId));
      const sharedConvMember = user2Conversations.find(c =>
        user1ConvIds.has(c.conversationId),
      );

      let conversationId: Id<'conversations'> | null = null;

      if (sharedConvMember) {
        const conversation = await ctx.db.get(sharedConvMember.conversationId);
        if (conversation?.type === 'direct' && conversation.isActive) {
          conversationId = conversation._id;
        }
      }

      if (!conversationId) {
        conversationId = await ctx.db.insert('conversations', {
          type: 'direct',
          isActive: true,
          createdBy: currentUser._id,
          lastMessageAt: Date.now(),
        });

        await ctx.db.insert('conversationMembers', {
          conversationId,
          userId: currentUser._id,
          joinedAt: Date.now(),
          isMuted: false,
          isPinned: false,
        });

        await ctx.db.insert('conversationMembers', {
          conversationId,
          userId: args.targetUserId,
          joinedAt: Date.now(),
          isMuted: false,
          isPinned: false,
        });
      }

      await ctx.db.insert('conversationMessages', {
        conversationId,
        senderId: currentUser._id,
        content:
          args.inviteMessage ||
          `Hey! Join me on **${server.name}**!\n\n${inviteLink}`,
        type: 'text',
      });

      await ctx.db.patch(conversationId, {
        lastMessageAt: Date.now(),
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
    const user = await getCurrent(ctx);
    if (!user) return null;
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const categoryMap = new Map(categories.map(cat => [cat._id, cat]));

    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .collect();

    const roles = await Promise.all(
      userRoles.map(async ur => {
        const role = await ctx.db.get(ur.roleId);
        return role;
      }),
    );

    const validRoles = roles.filter((r): r is Doc<'roles'> => r !== null);

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
    const user = await getCurrentUserOrThrow(ctx);
    const hasAccess = await canUserAccessChannel(
      ctx,
      user._id,
      args.channelId,
      args.serverId,
    );

    if (!hasAccess) {
      throw new Error('No access to this channel');
    }

    const existing = await ctx.db
      .query('userLastViewedChannels')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        channelId: args.channelId,
        lastViewedAt: Date.now(),
      });
    } else {
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
    const user = await getCurrentUserOrThrow(ctx);
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

        if (!roleHasAccessToCategory) {
          throw new Error(
            'Cannot grant channel access to role that does not have access to the parent category',
          );
        }
      }
    }

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
    const user = await getCurrentUserOrThrow(ctx);
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error('Permission not found');

    const channel = await ctx.db.get(permission.channelId);
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error('Permission not found');

    const category = await ctx.db.get(permission.categoryId);
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

    await ctx.db.delete(args.permissionId);

    return { success: true };
  },
});

export const getUserServers = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrent(ctx);
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
    const user = await getCurrent(ctx);
    if (!user) return null;
    const server = await ctx.db.get(args.serverId);
    if (!server) return null;

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

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
    const user = await getCurrent(ctx);
    if (!user) return [];

    const userMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!userMembership || userMembership.isBanned) return [];

    const members = await ctx.db
      .query('serverMembers')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .filter(q => q.eq(q.field('isBanned'), false))
      .collect();

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
    const user = await getCurrentUserOrThrow(ctx);
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

    await ctx.db.insert('serverMembers', {
      serverId,
      userId: user._id,
      role: 'owner',
      joinedAt: Date.now(),
      isMuted: false,
      isDeafened: false,
      isBanned: false,
    });

    const everyoneRoleId = await ctx.db.insert('roles', {
      serverId,
      name: '@everyone',
      color: undefined,
      position: 0,
      permissions: 0,
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

    // Auto-assign @everyone role to owner
    await ctx.db.insert('userRoles', {
      userId: user._id,
      roleId: everyoneRoleId,
      serverId,
      assignedAt: Date.now(),
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

    if (server.ownerId !== user._id) {
      throw new Error('Only server owner can delete the server');
    }

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

    await Promise.all(members.map(member => ctx.db.delete(member._id)));
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
    await Promise.all(categories.map(cat => ctx.db.delete(cat._id)));
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
    const user = await getCurrentUserOrThrow(ctx);

    const serverInvite = await ctx.db
      .query('serverInvites')
      .withIndex('by_code', q => q.eq('code', args.inviteCode))
      .first();

    let server;
    let isTemporary = false;

    if (serverInvite) {
      if (serverInvite.status !== 'active') {
        throw new Error('This invite is no longer valid');
      }

      if (serverInvite.expiresAt && serverInvite.expiresAt < Date.now()) {
        await ctx.db.patch(serverInvite._id, { status: 'expired' });
        throw new Error('This invite has expired');
      }

      if (
        serverInvite.maxUses !== undefined &&
        serverInvite.uses >= serverInvite.maxUses
      ) {
        await ctx.db.patch(serverInvite._id, { status: 'expired' });
        throw new Error('This invite has reached its maximum uses');
      }

      server = await ctx.db.get(serverInvite.serverId);
      isTemporary = serverInvite.temporary;
    } else {
      server = await ctx.db
        .query('servers')
        .withIndex('by_invite_code', q => q.eq('inviteCode', args.inviteCode))
        .first();
    }

    if (!server) throw new Error('Invalid invite code');

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

    await ctx.db.insert('serverMembers', {
      serverId: server._id,
      userId: user._id,
      role: 'member',
      joinedAt: Date.now(),
      isMuted: false,
      isDeafened: false,
      isBanned: false,
      isTemporary,
    });

    const everyoneRole = await ctx.db
      .query('roles')
      .withIndex('by_server', q => q.eq('serverId', server._id))
      .filter(q => q.eq(q.field('isDefault'), true))
      .first();

    if (everyoneRole) {
      await ctx.db.insert('userRoles', {
        userId: user._id,
        roleId: everyoneRole._id,
        serverId: server._id,
        assignedAt: Date.now(),
      });
    }

    await ctx.db.patch(server._id, {
      memberCount: server.memberCount + 1,
      updatedAt: Date.now(),
    });

    if (serverInvite) {
      const newUses = serverInvite.uses + 1;
      await ctx.db.patch(serverInvite._id, { uses: newUses });

      if (
        serverInvite.maxUses !== undefined &&
        newUses >= serverInvite.maxUses
      ) {
        await ctx.db.patch(serverInvite._id, { status: 'expired' });
      }
    }

    const relatedNotifications = await ctx.db
      .query('notifications')
      .filter(q =>
        q.and(
          q.eq(q.field('userId'), user._id),
          q.or(
            q.eq(q.field('type'), 'server_invite'),
            q.eq(q.field('type'), 'server_invite_pending'),
            q.eq(q.field('type'), 'server_invite_request'),
          ),
          q.eq(q.field('metadata.serverId'), server._id),
        ),
      )
      .collect();

    await Promise.all(
      relatedNotifications.map(notification => ctx.db.delete(notification._id)),
    );

    return {
      serverId: server._id,
      serverName: server.name,
      isTemporary,
    };
  },
});

export const leaveServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('Server not found');

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

    await ctx.db.delete(membership._id);
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
    const user = await getCurrentUserOrThrow(ctx);
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

export const getServerInviteCode = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const user = await getCurrent(ctx);
    if (!user) return null;

    const server = await ctx.db.get(args.serverId);
    if (!server) return null;

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    return {
      inviteCode: server.inviteCode,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${server.inviteCode}`,
      isPublic: server.isPublic,
    };
  },
});

export const createCategory = mutation({
  args: {
    serverId: v.id('servers'),
    name: v.string(),
    position: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    roleIds: v.optional(v.array(v.id('roles'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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
    if (args.isPrivate !== undefined) {
      updates.isPrivate = args.isPrivate;

      const channelsInCategory = await ctx.db
        .query('channels')
        .withIndex('by_category', q => q.eq('categoryId', args.categoryId))
        .collect();

      await Promise.all(
        channelsInCategory.map(channel =>
          ctx.db.patch(channel._id, {
            isPrivate: args.isPrivate,
            updatedAt: Date.now(),
          }),
        ),
      );

      const everyoneRole = await ctx.db
        .query('roles')
        .withIndex('by_server', q => q.eq('serverId', category.serverId))
        .filter(q => q.eq(q.field('isDefault'), true))
        .first();

      if (everyoneRole) {
        const everyonePermission = await ctx.db
          .query('categoryPermissions')
          .withIndex('by_category_role', q =>
            q.eq('categoryId', args.categoryId).eq('roleId', everyoneRole._id),
          )
          .first();

        if (args.isPrivate) {
          if (everyonePermission) {
            await ctx.db.delete(everyonePermission._id);
          }
        } else {
          if (!everyonePermission) {
            await ctx.db.insert('categoryPermissions', {
              categoryId: args.categoryId,
              roleId: everyoneRole._id,
              userId: undefined,
              canView: true,
            });
          }
        }
      }
    }

    await ctx.db.patch(args.categoryId, updates);

    return { success: true };
  },
});

export const getCategoryPermissions = query({
  args: {
    categoryId: v.id('channelCategories'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const permissions = await ctx.db
      .query('categoryPermissions')
      .withIndex('by_category', q => q.eq('categoryId', args.categoryId))
      .collect();

    const rolesWithPermissions = await Promise.all(
      permissions
        .filter(perm => perm.roleId)
        .map(async perm => {
          const role = await ctx.db.get(perm.roleId!);
          return {
            permissionId: perm._id,
            role,
            canView: perm.canView,
            type: 'role' as const,
          };
        }),
    );

    const usersWithPermissions = await Promise.all(
      permissions
        .filter(perm => perm.userId)
        .map(async perm => {
          const permUser = await ctx.db.get(perm.userId!);
          return {
            permissionId: perm._id,
            user: permUser,
            canView: perm.canView,
            type: 'user' as const,
          };
        }),
    );

    const server = await ctx.db.get(category.serverId);
    const filteredUsers = usersWithPermissions.filter(u => u.user !== null);

    if (server) {
      const ownerInList = filteredUsers.some(
        u => u.user && u.user._id === server.ownerId,
      );

      if (!ownerInList) {
        const owner = await ctx.db.get(server.ownerId);
        if (owner) {
          filteredUsers.unshift({
            permissionId: 'owner' as any,
            user: owner,
            canView: true,
            type: 'user' as const,
          });
        }
      }
    }

    return {
      roles: rolesWithPermissions.filter(
        r => r.role !== null && !r.role.isDefault,
      ),
      users: filteredUsers,
    };
  },
});

export const getChannelPermissions = query({
  args: {
    channelId: v.id('channels'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const permissions = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .collect();

    const rolesWithPermissions = await Promise.all(
      permissions
        .filter(perm => perm.roleId)
        .map(async perm => {
          const role = await ctx.db.get(perm.roleId!);
          return {
            permissionId: perm._id,
            role,
            canView: perm.canView,
            canSend: perm.canSend,
            type: 'role' as const,
          };
        }),
    );

    const usersWithPermissions = await Promise.all(
      permissions
        .filter(perm => perm.userId)
        .map(async perm => {
          const permUser = await ctx.db.get(perm.userId!);
          return {
            permissionId: perm._id,
            user: permUser,
            canView: perm.canView,
            canSend: perm.canSend,
            type: 'user' as const,
          };
        }),
    );

    const server = await ctx.db.get(channel.serverId);
    const filteredUsers = usersWithPermissions.filter(u => u.user !== null);

    if (server) {
      const ownerInList = filteredUsers.some(
        u => u.user && u.user._id === server.ownerId,
      );

      if (!ownerInList) {
        const owner = await ctx.db.get(server.ownerId);
        if (owner) {
          filteredUsers.unshift({
            permissionId: 'owner' as any,
            user: owner,
            canView: true,
            canSend: true,
            type: 'user' as const,
          });
        }
      }
    }

    return {
      roles: rolesWithPermissions.filter(
        r => r.role !== null && !r.role.isDefault,
      ),
      users: filteredUsers,
    };
  },
});

export const addCategoryPermission = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    roleId: v.id('roles'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const role = await ctx.db.get(args.roleId);
    if (!role || role.serverId !== category.serverId) {
      throw new Error('Role not found or does not belong to this server');
    }

    const existing = await ctx.db
      .query('categoryPermissions')
      .withIndex('by_category_role', q =>
        q.eq('categoryId', args.categoryId).eq('roleId', args.roleId),
      )
      .first();

    if (existing) {
      throw new Error('Permission already exists');
    }

    const permissionId = await ctx.db.insert('categoryPermissions', {
      categoryId: args.categoryId,
      roleId: args.roleId,
      userId: undefined,
      canView: true,
    });

    return { success: true, permissionId };
  },
});

export const addCategoryUserPermission = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const targetMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', category.serverId).eq('userId', args.userId),
      )
      .first();

    if (!targetMembership) {
      throw new Error('User is not a member of this server');
    }

    const existing = await ctx.db
      .query('categoryPermissions')
      .withIndex('by_category', q => q.eq('categoryId', args.categoryId))
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (existing) {
      throw new Error('Permission already exists');
    }

    const permissionId = await ctx.db.insert('categoryPermissions', {
      categoryId: args.categoryId,
      roleId: undefined,
      userId: args.userId,
      canView: true,
    });

    return { success: true, permissionId };
  },
});

export const addChannelPermission = mutation({
  args: {
    channelId: v.id('channels'),
    roleId: v.id('roles'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const existing = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .filter(q => q.eq(q.field('roleId'), args.roleId))
      .first();

    if (existing) {
      throw new Error('Permission already exists');
    }

    const permissionId = await ctx.db.insert('channelPermissions', {
      channelId: args.channelId,
      roleId: args.roleId,
      userId: undefined,
      canView: true,
      canSend: true,
    });

    return { success: true, permissionId };
  },
});

export const addChannelUserPermission = mutation({
  args: {
    channelId: v.id('channels'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    const targetMembership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', args.userId),
      )
      .first();

    if (!targetMembership) {
      throw new Error('User is not a member of this server');
    }

    const existing = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (existing) {
      throw new Error('Permission already exists');
    }

    const permissionId = await ctx.db.insert('channelPermissions', {
      channelId: args.channelId,
      roleId: undefined,
      userId: args.userId,
      canView: true,
      canSend: true,
    });

    return { success: true, permissionId };
  },
});

export const removeCategoryPermissionById = mutation({
  args: {
    permissionId: v.id('categoryPermissions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error('Permission not found');

    const category = await ctx.db.get(permission.categoryId);
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

    await ctx.db.delete(args.permissionId);

    return { success: true };
  },
});

export const removeChannelPermissionById = mutation({
  args: {
    permissionId: v.id('channelPermissions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error('Permission not found');

    const channel = await ctx.db.get(permission.channelId);
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

    await ctx.db.delete(args.permissionId);

    return { success: true };
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id('channelCategories'),
    deleteChannels: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
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

    const isPrivate = args.isPrivate ?? false;

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

    if (args.categoryId && isPrivate) {
      const categoryPerms = await ctx.db
        .query('categoryPermissions')
        .withIndex('by_category', q => q.eq('categoryId', args.categoryId!))
        .collect();

      await Promise.all(
        categoryPerms.map(perm =>
          ctx.db.insert('channelPermissions', {
            channelId,
            roleId: perm.roleId,
            userId: undefined,
            canView: perm.canView,
            canSend: true,
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);

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

export const getChannelById = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const user = await getCurrent(ctx);
    if (!user) return null;
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    if (channel.isPrivate) {
      if (membership.role !== 'owner' && membership.role !== 'admin') {
        const hasPermission = await ctx.db
          .query('channelPermissions')
          .withIndex('by_channel', q => q.eq('channelId', args.channelId))
          .filter(q => q.eq(q.field('userId'), user._id))
          .first();

        if (!hasPermission || !hasPermission.canView) {
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
    const user = await getCurrent(ctx);
    if (!user) return null;
    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const allChannels = await ctx.db
      .query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

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
    const user = await getCurrent(ctx);

    if (!user) return null;

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', args.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) return null;

    const isOwnerOrAdmin =
      membership.role === 'owner' || membership.role === 'admin';

    const categories = await ctx.db
      .query('channelCategories')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user_server', q =>
        q.eq('userId', user._id).eq('serverId', args.serverId),
      )
      .collect();

    const everyoneRole = await ctx.db
      .query('roles')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .filter(q => q.eq(q.field('isDefault'), true))
      .first();

    const allRoleIds = [
      ...userRoles.map(ur => ur.roleId),
      ...(everyoneRole ? [everyoneRole._id] : []),
    ];

    const categoriesWithPermissions = await Promise.all(
      categories.map(async category => {
        if (isOwnerOrAdmin) {
          return { ...category, canView: true };
        }

        if (!category.isPrivate) {
          return { ...category, canView: true };
        }

        const categoryPermissions = await ctx.db
          .query('categoryPermissions')
          .withIndex('by_category', q => q.eq('categoryId', category._id))
          .collect();

        for (const roleId of allRoleIds) {
          const rolePermission = categoryPermissions.find(
            p => p.roleId === roleId,
          );
          if (rolePermission?.canView) {
            return { ...category, canView: true };
          }
        }

        const userPermission = categoryPermissions.find(
          p => p.userId === user._id,
        );
        if (userPermission?.canView) {
          return { ...category, canView: true };
        }

        const channelsInCategory = await ctx.db
          .query('channels')
          .withIndex('by_category', q => q.eq('categoryId', category._id))
          .collect();

        for (const channel of channelsInCategory) {
          const hasChannelAccess = await canUserAccessChannelDirect(
            ctx,
            user._id,
            channel,
            args.serverId,
          );
          if (hasChannelAccess) {
            return { ...category, canView: true };
          }
        }

        return { ...category, canView: false };
      }),
    );

    return categoriesWithPermissions.sort((a, b) => a.position - b.position);
  },
});

export const getChannelsByCategories = query({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const user = await getCurrent(ctx);

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
  canManage: boolean;
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

  if (membership.role === 'owner' || membership.role === 'admin') {
    return { canView: true, canSend: true, canManage: true, canDelete: true };
  }

  if (!channel.isPrivate) {
    return {
      canView: true,
      canSend: membership.role !== 'member' || !membership.isMuted,
      canManage: membership.role === 'moderator',
      canDelete: false,
    };
  }

  if (channel.categoryId) {
    const category = await ctx.db.get(channel.categoryId);
    if (category && category.isPrivate) {
      const userRoles = await ctx.db
        .query('userRoles')
        .withIndex('by_user_server', q =>
          q.eq('userId', userId).eq('serverId', serverId),
        )
        .collect();

      const everyoneRole = await ctx.db
        .query('roles')
        .withIndex('by_server', q => q.eq('serverId', serverId))
        .filter(q => q.eq(q.field('isDefault'), true))
        .first();

      const allRoleIds = [
        ...userRoles.map(ur => ur.roleId),
        ...(everyoneRole ? [everyoneRole._id] : []),
      ].filter((id): id is Id<'roles'> => id !== undefined);

      const categoryPermissions = await ctx.db
        .query('categoryPermissions')
        .withIndex('by_category', q => q.eq('categoryId', channel.categoryId!))
        .collect();

      const hasAccessToCategory = categoryPermissions.some(
        perm =>
          perm.roleId !== undefined &&
          allRoleIds.includes(perm.roleId) &&
          perm.canView,
      );

      if (!hasAccessToCategory) {
        return {
          canView: false,
          canSend: false,
          canManage: false,
          canDelete: false,
        };
      }
    }
  }

  // Channel is private - check channel permissions
  let canView = false;
  let canSend = false;

  const userPermission = await ctx.db
    .query('channelPermissions')
    .withIndex('by_channel', q => q.eq('channelId', channelId))
    .filter(q => q.eq(q.field('userId'), userId))
    .first();

  if (userPermission) {
    canView = userPermission.canView;
    canSend = userPermission.canSend;
  } else {
    const userRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user_server', q =>
        q.eq('userId', userId).eq('serverId', serverId),
      )
      .collect();

    const everyoneRole = await ctx.db
      .query('roles')
      .withIndex('by_server', q => q.eq('serverId', serverId))
      .filter(q => q.eq(q.field('isDefault'), true))
      .first();

    const allRoleIds = [
      ...userRoles.map(ur => ur.roleId),
      ...(everyoneRole ? [everyoneRole._id] : []),
    ];

    const rolePermissions = await ctx.db
      .query('channelPermissions')
      .withIndex('by_channel', q => q.eq('channelId', channelId))
      .collect();

    for (const roleId of allRoleIds) {
      const permission = rolePermissions.find(p => p.roleId === roleId);
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

export const searchUsersAndRoles = query({
  args: {
    serverId: v.id('servers'),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { serverId, query: searchQuery, limit = 20 }) => {
    const currentUser = await getCurrent(ctx);

    if (!currentUser) return { users: [], roles: [] };

    const roles = await ctx.db
      .query('roles')
      .withIndex('by_server', q => q.eq('serverId', serverId))
      .collect();

    const filteredRoles = searchQuery
      ? roles
          .filter(role =>
            role.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, limit)
      : roles.slice(0, limit);

    const serverMembers = await ctx.db
      .query('serverMembers')
      .withIndex('by_server', q => q.eq('serverId', serverId))
      .collect();

    const userIds = serverMembers.map(member => member.userId);

    const users = await Promise.all(userIds.map(userId => ctx.db.get(userId)));

    const filteredUsers = searchQuery
      ? users
          .filter(
            user =>
              user &&
              (user.displayName
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
                user.username
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())),
          )
          .slice(0, limit)
      : users.filter(user => user !== null).slice(0, limit);

    return {
      users: filteredUsers.map(user => ({
        _id: user?._id,
        displayName: user?.displayName,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
        type: 'user' as const,
      })),
      roles: filteredRoles.map(role => ({
        _id: role._id,
        name: role.name,
        color: role.color,
        type: 'role' as const,
      })),
    };
  },
});

export const getChannelInvites = query({
  args: {
    channelId: v.id('channels'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const channel = await ctx.db.get(args.channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) {
      throw new Error('Not a member of this server');
    }

    const invitesResult = await ctx.db
      .query('serverInvites')
      .withIndex('by_server', q => q.eq('serverId', channel.serverId))
      .filter(q => q.eq(q.field('channelId'), args.channelId))
      .order('desc')
      .paginate(args.paginationOpts);

    const invitesWithInviter = await Promise.all(
      invitesResult.page.map(async invite => {
        const inviter = await ctx.db.get(invite.inviterId);
        return {
          ...invite,
          inviter: inviter
            ? {
                displayName: inviter.displayName,
                username: inviter.username,
                avatarUrl: inviter.avatarUrl,
              }
            : null,
        };
      }),
    );

    return {
      ...invitesResult,
      page: invitesWithInviter,
    };
  },
});

export const createChannelInvite = mutation({
  args: {
    channelId: v.id('channels'),
    maxUses: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    temporary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const channel = await ctx.db.get(args.channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) {
      throw new Error('Not a member of this server');
    }

    const allInvites = await ctx.db
      .query('serverInvites')
      .withIndex('by_server', q => q.eq('serverId', channel.serverId))
      .filter(q =>
        q.and(
          q.eq(q.field('channelId'), args.channelId),
          q.eq(q.field('status'), 'active'),
          q.eq(q.field('inviterId'), user._id),
        ),
      )
      .collect();

    const maxUses = args.maxUses ?? 0;
    const temporary = args.temporary ?? false;
    const expiresAt = args.maxAge
      ? Date.now() + args.maxAge * 1000
      : Date.now() + EXPIRED_TIME;

    const existingInvite = allInvites.find(invite => {
      const sameMaxUses = (invite.maxUses ?? 0) === maxUses;
      const sameTemporary = invite.temporary === temporary;

      return (
        sameMaxUses &&
        sameTemporary &&
        (!invite.expiresAt || invite.expiresAt > Date.now())
      );
    });

    if (existingInvite) {
      return {
        code: existingInvite.code,
        expiresAt: existingInvite.expiresAt,
        maxUses: existingInvite.maxUses,
        uses: existingInvite.uses,
        temporary: existingInvite.temporary,
        isNew: false,
      };
    }

    const inviteCode = generateInviteCode();

    await ctx.db.insert('serverInvites', {
      serverId: channel.serverId,
      channelId: args.channelId,
      inviterId: user._id,
      code: inviteCode,
      uses: 0,
      maxUses: maxUses || undefined,
      temporary,
      status: 'active',
      expiresAt,
    });

    return {
      code: inviteCode,
      expiresAt,
      maxUses: maxUses || undefined,
      uses: 0,
      temporary,
      isNew: true,
    };
  },
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id('serverInvites'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const invite = await ctx.db.get(args.inviteId);

    if (!invite) {
      throw new Error('Invite not found');
    }

    const channel = await ctx.db.get(invite.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) {
      throw new Error('Not a member of this server');
    }

    // Only owner/admin or invite creator can revoke
    if (
      membership.role !== 'owner' &&
      membership.role !== 'admin' &&
      invite.inviterId !== user._id
    ) {
      throw new Error('You do not have permission to revoke this invite');
    }

    await ctx.db.patch(args.inviteId, {
      status: 'revoked',
    });

    return { success: true };
  },
});

export const activateInvite = mutation({
  args: {
    inviteId: v.id('serverInvites'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const invite = await ctx.db.get(args.inviteId);

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'revoked') {
      throw new Error('Can only activate revoked invites');
    }

    const channel = await ctx.db.get(invite.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) {
      throw new Error('Not a member of this server');
    }

    // Only owner/admin or invite creator can activate
    if (
      membership.role !== 'owner' &&
      membership.role !== 'admin' &&
      invite.inviterId !== user._id
    ) {
      throw new Error('You do not have permission to activate this invite');
    }

    await ctx.db.patch(args.inviteId, {
      status: 'active',
    });

    return { success: true };
  },
});

export const deleteInvite = mutation({
  args: {
    inviteId: v.id('serverInvites'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const invite = await ctx.db.get(args.inviteId);

    if (!invite) {
      throw new Error('Invite not found');
    }

    const channel = await ctx.db.get(invite.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (!membership || membership.isBanned) {
      throw new Error('Not a member of this server');
    }

    // Only owner/admin or invite creator can delete
    if (
      membership.role !== 'owner' &&
      membership.role !== 'admin' &&
      invite.inviterId !== user._id
    ) {
      throw new Error('You do not have permission to delete this invite');
    }

    await ctx.db.delete(args.inviteId);

    return { success: true };
  },
});

export const getWebhooksByChannelId = query({
  args: {
    channelId: v.id('channels'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const hasAccess = await canUserAccessChannel(
      ctx,
      user._id,
      args.channelId,
      channel.serverId,
    );

    if (!hasAccess) {
      throw new Error('You do not have access to this channel');
    }

    const webhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_channel', q => q.eq('channelId', args.channelId))
      .collect();

    return await Promise.all(
      webhooks.map(async webhook => {
        const creator = await ctx.db.get(webhook.creatorId);
        return {
          ...webhook,
          creator: creator
            ? {
                _id: creator._id,
                username: creator.username,
                displayName: creator.displayName,
                avatarUrl: creator.avatarUrl,
              }
            : null,
        };
      }),
    );
  },
});

export const createWebhook = mutation({
  args: {
    channelId: v.id('channels'),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', channel.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      membership.isBanned ||
      (membership.role !== 'owner' && membership.role !== 'admin')
    ) {
      throw new Error('You do not have permission to create webhooks');
    }

    const token = `${channel.serverId}_${channel._id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const webhookId = await ctx.db.insert('webhooks', {
      channelId: args.channelId,
      serverId: channel.serverId,
      creatorId: user._id,
      name: args.name,
      avatarUrl: args.avatarUrl,
      token,
      isActive: true,
    });

    return webhookId;
  },
});

export const updateWebhook = mutation({
  args: {
    webhookId: v.id('webhooks'),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', webhook.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      membership.isBanned ||
      (membership.role !== 'owner' &&
        membership.role !== 'admin' &&
        webhook.creatorId !== user._id)
    ) {
      throw new Error('You do not have permission to update this webhook');
    }

    const updates: Partial<Doc<'webhooks'>> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.webhookId, updates);

    return { success: true };
  },
});

export const deleteWebhook = mutation({
  args: {
    webhookId: v.id('webhooks'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', webhook.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      membership.isBanned ||
      (membership.role !== 'owner' &&
        membership.role !== 'admin' &&
        webhook.creatorId !== user._id)
    ) {
      throw new Error('You do not have permission to delete this webhook');
    }

    await ctx.db.delete(args.webhookId);

    return { success: true };
  },
});

export const regenerateWebhookToken = mutation({
  args: {
    webhookId: v.id('webhooks'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const membership = await ctx.db
      .query('serverMembers')
      .withIndex('by_server_user', q =>
        q.eq('serverId', webhook.serverId).eq('userId', user._id),
      )
      .first();

    if (
      !membership ||
      membership.isBanned ||
      (membership.role !== 'owner' &&
        membership.role !== 'admin' &&
        webhook.creatorId !== user._id)
    ) {
      throw new Error(
        'You do not have permission to regenerate this webhook token',
      );
    }

    const token = `${webhook.serverId}_${webhook.channelId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await ctx.db.patch(args.webhookId, { token });

    return { token };
  },
});
