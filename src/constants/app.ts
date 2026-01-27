import { ServerMenu, StatusExpiredOption, StatusMapping } from '@/types';
import {
  IconCalendarEvent,
  IconCirclePlusFilled,
  IconFolderPlus,
  IconInbox,
  IconLogout2,
  IconSettings,
} from '@tabler/icons-react';
import { ArrowLeftRight } from 'lucide-react';

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
