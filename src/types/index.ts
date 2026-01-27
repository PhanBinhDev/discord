/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserStatus } from '@/convex/schema';
import { DictKey } from '@/internationalization/get-dictionaries';
import { TablerIcon } from '@tabler/icons-react';
import { FunctionReference } from 'convex/server';
import { LucideIcon } from 'lucide-react';

export type ApiReturn<T extends FunctionReference<any>> =
  T extends FunctionReference<any, any, any, infer Return> ? Return : never;

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
  | 'ModalSettingsUser'
  | 'ModalServerSettings'
  | 'ModalCreateChannel'
  | 'ModalCreateCategory'
  | 'ModalInvitePeople'
  | 'ModalEditChannel'
  | 'ModalDeleteChannel'
  | 'ModalDeleteServer'
  | 'ModalCreateEvent';

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

export type ServerMenuGroup = 'general' | 'management' | 'danger';

export type ServerMenu = {
  label: DictKey;
  icon: TablerIcon | LucideIcon;
  group: ServerMenuGroup;
  owner: boolean;
  modal: ModalType | null;
};
