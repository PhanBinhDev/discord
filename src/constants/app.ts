import { StatusExpiredOption, StatusMapping } from '@/types';

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
