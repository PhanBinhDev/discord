/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/convex/_generated/api';
import { Doc, Id, TableNames } from '@/convex/_generated/dataModel';
import { ChannelType, UserStatus } from '@/convex/schema';
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
  | 'ModalCreateEvent'
  | 'ModalEditCategory'
  | 'ModalDeleteCategory';

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

export type ChannelWithCategory = NonNullable<
  ApiReturn<typeof api.servers.getAccessibleChannels>
>['channels'][number];

export type RenderItem =
  | {
      type: 'category';
      category: NonNullable<ChannelWithCategory['category']>;
      channels: ChannelWithCategory[];
      position: number;
    }
  | {
      type: 'channel';
      channel: ChannelWithCategory;
      position: number;
    };

export type ChannelTypeOptions = {
  isPrivate: boolean;
  isActive?: boolean;
  hasChatFeature?: boolean;
};

export type ChannelIconType = {
  [key in ChannelType]: (
    options: ChannelTypeOptions,
  ) =>
    | LucideIcon
    | TablerIcon
    | React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type TreeItem = {
  id: Id<TableNames>;
  type: 'category' | 'channel';
  data: Doc<'channelCategories'> | ChannelWithCategory;
  children?: TreeItem[];
  position: number;
  parentId?: Id<TableNames>;
};

export type FlattenedItem = TreeItem & {
  depth: number;
  index: number;
};

export type ChannelTypeItem = {
  label: DictKey;
  desc: DictKey;
  value: ChannelType;
  icon: (
    isPrivate: boolean,
  ) =>
    | LucideIcon
    | TablerIcon
    | React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type EmojiMartEmoji = {
  id?: string;
  name?: string;
  native?: string;
  unified?: string;
  colons?: string;
  skin?: number;
  shortcodes?: string[];
  [key: string]: unknown;
};

export type CategoryMenuNav = {
  key: string;
  label: DictKey;
  icon: TablerIcon | LucideIcon;
};

export type CategoryMenuItem = CategoryMenuNav & {
  action: 'markAsRead' | 'edit' | 'delete';
};

export type TranslateTextKey = {
  value: DictKey;
  params?: Record<string, string | number>;
};
