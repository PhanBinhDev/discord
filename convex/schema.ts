// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { notifications } from './notifications';

// ==================== ENUMS ====================
export const UserStatus = v.union(
  v.literal('online'),
  v.literal('away'),
  v.literal('busy'),
  v.literal('offline'),
);

export const ChannelType = v.union(
  v.literal('text'),
  v.literal('voice'),
  v.literal('announcement'),
);

export const MessageType = v.union(
  v.literal('text'),
  v.literal('image'),
  v.literal('video'),
  v.literal('audio'),
  v.literal('file'),
  v.literal('system'),
);

export const MemberRole = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('moderator'),
  v.literal('member'),
);

export const InviteStatus = v.union(
  v.literal('active'),
  v.literal('expired'),
  v.literal('revoked'),
);

export const FriendRequestStatus = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('blocked'),
);

export const DMPermission = v.union(
  v.literal('everyone'),
  v.literal('friends'),
  v.literal('server_members'),
  v.literal('none'),
);

// ==================== TYPES ====================

export type UserStatus = typeof UserStatus.type;
export type ChannelType = typeof ChannelType.type;
export type MessageType = typeof MessageType.type;
export type MemberRole = typeof MemberRole.type;
export type InviteStatus = typeof InviteStatus.type;
export type FriendRequestStatus = typeof FriendRequestStatus.type;
export type DMPermission = typeof DMPermission.type;

// ==================== TABLES ====================

// Users Table
const users = defineTable({
  clerkId: v.string(),
  email: v.string(),
  username: v.string(),
  displayName: v.optional(v.string()),
  discriminator: v.string(), // #1234
  avatarUrl: v.optional(v.string()),
  avatarStorageId: v.optional(v.id('_storage')),
  bannerUrl: v.optional(v.string()),
  bannerStorageId: v.optional(v.id('_storage')),
  bio: v.optional(v.string()),
  status: v.optional(UserStatus),
  statusExpiredAt: v.optional(v.number()),
  customStatus: v.optional(v.string()),
  lastSeen: v.optional(v.number()),
  emailVerified: v.boolean(),
  searchText: v.string(),
})
  .index('by_clerk_id', ['clerkId'])
  .index('by_email', ['email'])
  .index('by_username', ['username'])
  .index('by_status', ['status'])
  .searchIndex('searchText', {
    searchField: 'searchText',
  });

// Friends Table
const friends = defineTable({
  userId1: v.id('users'),
  userId2: v.id('users'),
  status: FriendRequestStatus,
  requestedBy: v.id('users'),
  acceptedAt: v.optional(v.number()),
})
  .index('by_user1', ['userId1'])
  .index('by_user2', ['userId2'])
  .index('by_status', ['status'])
  .index('by_users', ['userId1', 'userId2']);

// Servers Table
const servers = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  iconUrl: v.optional(v.string()),
  iconStorageId: v.optional(v.id('_storage')),
  bannerUrl: v.optional(v.string()),
  bannerStorageId: v.optional(v.id('_storage')),
  ownerId: v.id('users'),
  inviteCode: v.optional(v.string()),
  isPublic: v.boolean(),
  memberCount: v.number(),
  vanityUrl: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index('by_owner', ['ownerId'])
  .index('by_invite_code', ['inviteCode'])
  .index('by_vanity_url', ['vanityUrl'])
  .searchIndex('search_servers', {
    searchField: 'name',
    filterFields: ['name', 'description'],
  });

// Server Members Table
const serverMembers = defineTable({
  serverId: v.id('servers'),
  userId: v.id('users'),
  role: MemberRole,
  nickname: v.optional(v.string()),
  joinedAt: v.number(),
  isMuted: v.boolean(),
  isDeafened: v.boolean(),
  isBanned: v.boolean(),
  bannedAt: v.optional(v.number()),
  bannedReason: v.optional(v.string()),
})
  .index('by_server', ['serverId'])
  .index('by_user', ['userId'])
  .index('by_server_user', ['serverId', 'userId'])
  .index('by_role', ['role']);

// Roles Table
const roles = defineTable({
  serverId: v.id('servers'),
  name: v.string(),
  color: v.optional(v.string()),
  position: v.number(),
  permissions: v.number(), // Bitfield
  isHoisted: v.boolean(),
  isMentionable: v.boolean(),
  isDefault: v.boolean(),
})
  .index('by_server', ['serverId'])
  .index('by_position', ['serverId', 'position']);

// User Roles (Many-to-Many)
const userRoles = defineTable({
  userId: v.id('users'),
  roleId: v.id('roles'),
  serverId: v.id('servers'),
  assignedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_role', ['roleId'])
  .index('by_server', ['serverId'])
  .index('by_user_server', ['userId', 'serverId']);

// Channel Categories Table
const channelCategories = defineTable({
  serverId: v.id('servers'),
  name: v.string(),
  position: v.number(),
})
  .index('by_server', ['serverId'])
  .index('by_position', ['serverId', 'position']);

// Channels Table
const channels = defineTable({
  serverId: v.id('servers'),
  categoryId: v.optional(v.id('channelCategories')),
  name: v.string(),
  type: ChannelType,
  topic: v.optional(v.string()),
  position: v.number(),
  isPrivate: v.boolean(),
  isNsfw: v.boolean(),
  slowMode: v.optional(v.number()), // seconds
  userLimit: v.optional(v.number()), // for voice channels
  bitrate: v.optional(v.number()), // for voice channels
  updatedAt: v.number(),
})
  .index('by_server', ['serverId'])
  .index('by_category', ['categoryId'])
  .index('by_type', ['type'])
  .index('by_position', ['serverId', 'position']);

// Messages Table
const messages = defineTable({
  channelId: v.id('channels'),
  serverId: v.optional(v.id('servers')),
  userId: v.id('users'),
  content: v.string(),
  type: MessageType,
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
  embeds: v.optional(v.array(v.any())),
  mentions: v.optional(v.array(v.id('users'))),
  mentionRoles: v.optional(v.array(v.id('roles'))),
  mentionEveryone: v.boolean(),
  isPinned: v.boolean(),
  replyToId: v.optional(v.id('messages')),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index('by_channel', ['channelId'])
  .index('by_user', ['userId'])
  .index('by_server', ['serverId'])
  .searchIndex('search_messages', {
    searchField: 'content',
    filterFields: ['channelId', 'userId'],
  });

// Direct Messages (DMs)
const directMessages = defineTable({
  senderId: v.id('users'),
  receiverId: v.id('users'),
  content: v.string(),
  type: MessageType,
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
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index('by_sender', ['senderId'])
  .index('by_receiver', ['receiverId'])
  .index('by_conversation', ['senderId', 'receiverId']);

const reactions = defineTable({
  messageId: v.id('messages'),
  userId: v.id('users'),
  emoji: v.string(),
  isCustomEmoji: v.boolean(),
  emojiId: v.optional(v.string()),
})
  .index('by_message', ['messageId'])
  .index('by_user', ['userId'])
  .index('by_message_emoji', ['messageId', 'emoji']);

const serverInvites = defineTable({
  serverId: v.id('servers'),
  channelId: v.id('channels'),
  inviterId: v.id('users'),
  code: v.string(),
  maxUses: v.optional(v.number()),
  uses: v.number(),
  maxAge: v.optional(v.number()), // seconds
  temporary: v.boolean(),
  status: InviteStatus,
  expiresAt: v.optional(v.number()),
})
  .index('by_code', ['code'])
  .index('by_server', ['serverId'])
  .index('by_inviter', ['inviterId'])
  .index('by_status', ['status']);

const serverCategories = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  iconUrl: v.optional(v.string()),
  position: v.number(),
}).index('by_position', ['position']);

const serverCategoryMapping = defineTable({
  serverId: v.id('servers'),
  categoryId: v.id('serverCategories'),
})
  .index('by_server', ['serverId'])
  .index('by_category', ['categoryId']);

// Server Boosts Table
const serverBoosts = defineTable({
  serverId: v.id('servers'),
  userId: v.id('users'),
  boostLevel: v.number(),
  boostedAt: v.number(),
  expiresAt: v.optional(v.number()),
})
  .index('by_server', ['serverId'])
  .index('by_user', ['userId']);

// Voice Channels State
const voiceChannelStates = defineTable({
  channelId: v.id('channels'),
  userId: v.id('users'),
  isMuted: v.boolean(),
  isDeafened: v.boolean(),
  isSpeaking: v.boolean(),
  joinedAt: v.number(),
})
  .index('by_channel', ['channelId'])
  .index('by_user', ['userId'])
  .index('by_channel_user', ['channelId', 'userId']);

// Reports Table
const reports = defineTable({
  reportedUserId: v.id('users'),
  reportedBy: v.id('users'),
  serverId: v.optional(v.id('servers')),
  messageId: v.optional(v.id('messages')),
  reason: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal('pending'),
    v.literal('resolved'),
    v.literal('rejected'),
  ),
  resolvedBy: v.optional(v.id('users')),
  resolvedAt: v.optional(v.number()),
})
  .index('by_reported_user', ['reportedUserId'])
  .index('by_reporter', ['reportedBy'])
  .index('by_server', ['serverId'])
  .index('by_status', ['status']);

// User Settings Table
const userSettings = defineTable({
  userId: v.id('users'),
  theme: v.string(),
  accentColor: v.optional(v.string()),
  language: v.string(),
  notifications: v.object({
    messages: v.boolean(),
    mentions: v.boolean(),
    directMessages: v.boolean(),
    calls: v.boolean(),
    sounds: v.boolean(),
  }),
  privacy: v.object({
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
  appearance: v.object({
    messageDisplayCompact: v.boolean(),
    showEmbeds: v.boolean(),
    showReactions: v.boolean(),
    animateEmojis: v.boolean(),
  }),
  voice: v.optional(
    v.object({
      defaultMuted: v.boolean(),
      defaultDeafened: v.boolean(),
      inputVolume: v.optional(v.number()),
      outputVolume: v.optional(v.number()),
    }),
  ),
}).index('by_user', ['userId']);

// Webhooks Table
const webhooks = defineTable({
  channelId: v.id('channels'),
  serverId: v.id('servers'),
  creatorId: v.id('users'),
  name: v.string(),
  avatarUrl: v.optional(v.string()),
  token: v.string(),
  isActive: v.boolean(),
})
  .index('by_channel', ['channelId'])
  .index('by_server', ['serverId'])
  .index('by_token', ['token']);

const eventLogs = defineTable({
  eventType: v.string(),
  userId: v.id('users'),
  serverId: v.optional(v.id('servers')),
  channelId: v.optional(v.id('channels')),
  metadata: v.any(),
  timestamp: v.number(),
})
  .index('by_type', ['eventType'])
  .index('by_user', ['userId'])
  .index('by_server', ['serverId'])
  .index('by_timestamp', ['timestamp']);

const channelPermissions = defineTable({
  channelId: v.id('channels'),
  roleId: v.optional(v.id('roles')), // null = everyone
  userId: v.optional(v.id('users')), // cho phép user cụ thể
  canView: v.boolean(),
  canSend: v.boolean(),
})
  .index('by_channel', ['channelId'])
  .index('by_role', ['roleId'])
  .index('by_user', ['userId'])
  .index('by_channel_role', ['channelId', 'roleId']);

// User Last Viewed Channels - lưu channel cuối cùng user xem ở mỗi server
const userLastViewedChannels = defineTable({
  userId: v.id('users'),
  serverId: v.id('servers'),
  channelId: v.id('channels'),
  lastViewedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_server', ['serverId'])
  .index('by_user_server', ['userId', 'serverId']);

// ==================== SCHEMA EXPORT ====================

const schema = defineSchema({
  // Core User Management
  users,
  friends,
  userSettings,

  // Server Management
  servers,
  serverMembers,
  serverCategories,
  serverCategoryMapping,
  serverBoosts,
  serverInvites,

  // Roles & Permissions
  roles,
  userRoles,

  // Channels
  channelCategories,
  channels,
  voiceChannelStates,

  // Messaging
  messages,
  directMessages,
  reactions,

  // Moderation
  reports,

  // Integrations
  webhooks,
  eventLogs,

  notifications,

  channelPermissions,
  userLastViewedChannels,
});

export default schema;
