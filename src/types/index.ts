import { UserStatus } from '@/convex/schema';
import { DictKey } from '@/internationalization/get-dictionaries';
import { TablerIcon } from '@tabler/icons-react';
import { FunctionReference } from 'convex/server';

export type ExtractArgs<T> =
  T extends FunctionReference<'mutation', 'public', infer Args> ? Args : never;

export type NavItem = {
  name: string;
  href: string;
  icon: TablerIcon;
  translationKey: DictKey;
  badge?: number;
  exactMatch?: boolean;
};

export type ModalType =
  | 'ModalCreateServer'
  | 'ModalCreateDirectMessage'
  | 'ModalSetUserStatus'
  | 'ModalSettingsUser';

export type PaginationMode = 'offset' | 'button-load-more' | 'infinite-scroll';

export type StatusMapping = {
  label: DictKey;
  value: UserStatus;
};

export type StatusExpiredValue =
  | '15_minutes'
  | '1_hour'
  | '8_hours'
  | '24_hours'
  | '3_days'
  | 'never';

export type StatusExpiredOption = {
  label: DictKey;
  value: StatusExpiredValue;
};
