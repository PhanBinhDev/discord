import type { NavItem } from '@/types';
import {
  IconBell,
  IconHome,
  IconMessage,
  IconSettings,
  IconUsers,
  IconVideo,
} from '@tabler/icons-react';

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

export const navigation: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: IconHome,
    translationKey: 'nav.dashboard',
    exactMatch: true,
  },
  {
    name: 'Meetings',
    href: '/dashboard/meetings',
    icon: IconVideo,
    translationKey: 'nav.meetings',
  },
  {
    name: 'Chats',
    href: '/dashboard/chats',
    icon: IconMessage,
    translationKey: 'nav.chats',
  },
  {
    name: 'Contacts',
    href: '/dashboard/contacts',
    icon: IconUsers,
    translationKey: 'nav.contacts',
  },
];

export const secondaryNavigation: NavItem[] = [
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: IconBell,
    translationKey: 'nav.notifications',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: IconSettings,
    translationKey: 'nav.settings',
  },
];
