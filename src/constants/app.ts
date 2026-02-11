import IconAnnouncementChannel from '@/components/icons/announcement-channel';
import IconAnnouncementChatChannel from '@/components/icons/announcement-chat-channel';
import IconAnnouncementChatPrivateChannel from '@/components/icons/announcement-chat-private-channel';
import IconAnnouncementPrivateChannel from '@/components/icons/announcement-private-channel';
import IconTextChannel from '@/components/icons/text-channel';
import IconTextChatChannel from '@/components/icons/text-chat-channel';
import IconTextPrivateChannel from '@/components/icons/text-private-channel';
import TextPrivateChatChannel from '@/components/icons/text-private-chat-channel';
import IconVoiceActiveChannel from '@/components/icons/voice-active-channel';
import IconVoiceChannel from '@/components/icons/voice-channel';
import IconVoicePrivateActiveChannel from '@/components/icons/voice-private-active-channel';
import IconVoicePrivateChannel from '@/components/icons/voice-private-channel';
import {
  ActionParams,
  CategoryManageNavItemsKey,
  CategoryMenuItem,
  CategoryMenuItemKey,
  CategoryMenuNav,
  ChannelIconType,
  ChannelManageNavItemsKey,
  ChannelTypeItem,
  FriendContextItem,
  GetUserDetailsTabType,
  ServerMenu,
  StatusExpiredOption,
  StatusMapping,
  UserDetailsTabType,
} from '@/types';
import {
  IconCalendarEvent,
  IconChecks,
  IconCirclePlusFilled,
  IconFolderPlus,
  IconInbox,
  IconLogout2,
  IconSettings,
  IconShieldCog,
  IconTrash,
  IconUserCircle,
  IconUsersPlus,
  IconWebhook,
} from '@tabler/icons-react';
import {
  ArrowLeftRight,
  MessageCircle,
  Phone,
  Shield,
  UserMinus,
  UserPlus,
} from 'lucide-react';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
export const TOPIC_CHANNEL_MAX_LENGTH = 990;
export const DEFAULT_ROLE_COLOR = '#8e9297';
export const MIN_LENGTH_CHANNEL_NAME = 1;
export const MAX_LENGTH_CHANNEL_NAME = 100;
export const DROPPABLE_CATEGORY = 'category-droppable';
export const CHANNEL_CATEGORY_UNCATEGORIZED = 'uncategorized';
export const INTERVAL = 60; // seconds
export const MAX_USERS_SHOW = 2;
export const MAX_LAYERS = 1000;
export const DEFAULT_NAME_TEAMMATE = 'Teammate';
export const HANDLE_WIDTH = 6;
export const SELECTION_NET_THRESHOLD = 5;
export const LEFT_MARGIN_DEFAULT = 56;
export const RIGHT_MARGIN_DEFAULT = 56;
export const DEFAULT_LIMIT = 5;
export const OPTIONS_LIMIT = [
  DEFAULT_LIMIT,
  DEFAULT_LIMIT * 2,
  DEFAULT_LIMIT * 5,
  DEFAULT_LIMIT * 10,
];

export const DragType = {
  CHANNEL: 'channel',
  CATEGORY: 'category',
} as const;

export const DropType = {
  CATEGORY: 'category-droppable',
} as const;

export const DEFAULT_PANNEL_LEFT_MIN_WIDTH = 300; // in px
export const CUSTOM_USER_PROFILE_BANNER_HEIGHT = 105; // in px

export const StatusMappingField: StatusMapping[] = [
  {
    label: 'common.status.online',
    value: 'online',
  },
  {
    label: 'common.status.away',
    value: 'away',
  },

  {
    label: 'common.status.busy',
    value: 'busy',
  },
  {
    label: 'common.status.offline',
    value: 'offline',
  },
];

export const StatusExpiredOptions: StatusExpiredOption[] = [
  {
    label: 'servers.userStatus.time.15_minutes',
    value: '15_minutes',
  },
  {
    label: 'servers.userStatus.time.1_hour',
    value: '1_hour',
  },
  {
    label: 'servers.userStatus.time.8_hours',
    value: '8_hours',
  },
  {
    label: 'servers.userStatus.time.24_hours',
    value: '24_hours',
  },
  {
    label: 'servers.userStatus.time.3_days',
    value: '3_days',
  },
  {
    label: 'servers.userStatus.time.never',
    value: 'never',
  },
];

export const SlowModeOptions = [
  { label: 'Off', value: 0 },
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '15 seconds', value: 15 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '2 hours', value: 7200 },
  { label: '6 hours', value: 21600 },
];

export const ServerMenusItems: ServerMenu[] = [
  {
    label: 'servers.menu.invite',
    icon: IconInbox,
    group: 'general',
    owner: false,
    modal: 'ModalInvitePeople',
  },
  {
    label: 'servers.menu.settings',
    icon: IconSettings,
    group: 'general',
    owner: true,
    modal: 'ModalServerSettings',
  },
  {
    label: 'servers.menu.createChannel',
    icon: IconCirclePlusFilled,
    group: 'management',
    owner: true,
    modal: 'ModalCreateChannel',
  },
  {
    label: 'servers.menu.createCategory',
    icon: IconFolderPlus,
    group: 'management',
    owner: true,
    modal: 'ModalCreateCategory',
  },
  {
    label: 'servers.menu.createEvent',
    icon: IconCalendarEvent,
    group: 'management',
    owner: false,
    modal: 'ModalCreateEvent',
  },
  {
    label: 'servers.menu.leaveServer',
    icon: IconLogout2,
    group: 'danger',
    owner: false,
    modal: null,
  },
  {
    label: 'servers.menu.transferOwner',
    icon: ArrowLeftRight,
    group: 'management',
    owner: true,
    modal: null,
  },
] as const;

export const ChannelIconTypeMapping: ChannelIconType = {
  text: ({ isPrivate, hasChatFeature }) => {
    if (hasChatFeature && isPrivate) return TextPrivateChatChannel;
    if (!hasChatFeature && isPrivate) return IconTextPrivateChannel;
    if (!isPrivate && hasChatFeature) return IconTextChatChannel;

    return IconTextChannel;
  },
  voice: ({ isPrivate, isActive }) => {
    if (isPrivate && isActive) return IconVoicePrivateActiveChannel;
    if (isPrivate && !isActive) return IconVoicePrivateChannel;
    if (!isPrivate && isActive) return IconVoiceActiveChannel;
    return IconVoiceChannel;
  },
  announcement: ({ isPrivate, hasChatFeature }) => {
    if (hasChatFeature && isPrivate) return IconAnnouncementChatPrivateChannel;
    if (!hasChatFeature && isPrivate) return IconAnnouncementPrivateChannel;
    if (!isPrivate && hasChatFeature) return IconAnnouncementChatChannel;
    return IconAnnouncementChannel;
  },
};

export const ChannelTypeOptionsList: ChannelTypeItem[] = [
  {
    label: 'servers.channel.type.text.label',
    desc: 'servers.channel.type.text.desc',
    value: 'text',
    icon: (isPrivate: boolean) => {
      if (isPrivate) return IconTextPrivateChannel;
      return IconTextChannel;
    },
  },
  {
    label: 'servers.channel.type.voice.label',
    desc: 'servers.channel.type.voice.desc',
    value: 'voice',
    icon: (isPrivate: boolean) => {
      if (isPrivate) return IconVoicePrivateChannel;
      return IconVoiceChannel;
    },
  },
  {
    label: 'servers.channel.type.announcement.label',
    desc: 'servers.channel.type.announcement.desc',
    value: 'announcement',
    icon: (isPrivate: boolean) => {
      if (isPrivate) return IconAnnouncementPrivateChannel;
      return IconAnnouncementChannel;
    },
  },
];

export const CategoryContextMenuItems: CategoryMenuItem<CategoryMenuItemKey>[] =
  [
    {
      key: 'markAsRead',
      label: 'servers.category.context.markAsRead',
      action: 'markAsRead',
      icon: IconChecks,
    },
    {
      key: 'edit',
      label: 'servers.category.context.edit',
      action: 'edit',
      icon: IconSettings,
    },
    {
      key: 'delete',
      label: 'servers.category.context.delete',
      action: 'delete',
      icon: IconTrash,
    },
  ];

export const CategoryManageNavItems: CategoryMenuNav<CategoryManageNavItemsKey>[] =
  [
    {
      key: 'general',
      label: 'servers.category.edit.general.title',
      icon: IconSettings,
    },
    {
      key: 'permissions',
      label: 'servers.category.edit.permissions.title',
      icon: IconShieldCog,
    },
    {
      key: 'delete',
      label: 'servers.category.delete.title',
      icon: IconTrash,
    },
  ];

export const ChannelManageNavItems: CategoryMenuNav<ChannelManageNavItemsKey>[] =
  [
    {
      key: 'general',
      label: 'servers.channel.edit.general.title',
      icon: IconSettings,
    },
    {
      key: 'permissions',
      label: 'servers.channel.edit.permissions.title',
      icon: IconShieldCog,
    },
    {
      key: 'invite',
      label: 'servers.channel.edit.invite.title',
      icon: IconUsersPlus,
    },
    {
      key: 'integrations',
      label: 'servers.channel.edit.integrate.title',
      icon: IconWebhook,
    },
    {
      key: 'delete',
      label: 'servers.channel.edit.delete.title',
      icon: IconTrash,
    },
  ];

export const DirectActionParams: Record<string, ActionParams> = {
  ADD_FRIEND: 'add-friend',
  PENDING_FRIEND_REQUESTS: 'pending-friend-requests',
  ALL_FRIENDS: 'all-friends',
  ONLINE_FRIENDS: 'online-friends',
} as const;

export const getUserDetailsTabs = (params: GetUserDetailsTabType) => {
  return [
    {
      label: {
        value: 'servers.userDetails.tabs.activity',
      },
      key: 'activity',
    },
    {
      label: {
        value: params.commonFriends
          ? 'servers.userDetails.tabs.commonFriends'
          : 'servers.userDetails.tabs.noCommonFriends',
        params: {
          count: params.commonFriends ?? 0,
        },
      },
      key: 'friend',
    },
    {
      label: {
        value: params.commonServers
          ? 'servers.userDetails.tabs.commonServers'
          : 'servers.userDetails.tabs.noCommonServers',
        params: {
          count: params.commonServers ?? 0,
        },
      },
      key: 'server',
    },
  ] as const satisfies UserDetailsTabType[];
};

export const FriendContextMenuItems = (): FriendContextItem[] => {
  return [
    {
      key: 'profile',
      label: 'servers.userDetails.context.profile',
      action: 'profile',
      icon: IconUserCircle,
    },
    {
      key: 'message',
      label: 'servers.userDetails.context.message',
      action: 'message',
      icon: MessageCircle,
    },
    {
      key: 'call',
      label: 'servers.userDetails.context.call',
      action: 'call',
      icon: Phone,
    },
    {
      key: 'invite_server',
      label: 'servers.userDetails.context.inviteServer',
      action: 'invite_server',
      icon: UserPlus,
    },
    {
      key: 'remove_friend',
      label: 'servers.userDetails.context.removeFriend',
      action: 'remove_friend',
      icon: UserMinus,
    },
    {
      key: 'block',
      label: 'servers.userDetails.context.block',
      action: 'block',
      icon: Shield,
    },
  ] as const;
};
