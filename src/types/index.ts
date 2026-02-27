/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/convex/_generated/api';
import { Doc, Id, TableNames } from '@/convex/_generated/dataModel';
import { ChannelType, UserStatus } from '@/convex/schema';
import { DictKey } from '@/internationalization/get-dictionaries';
import { TablerIcon } from '@tabler/icons-react';
import { PaginationStatus } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { LucideIcon } from 'lucide-react';

export type PaginatedQueryStatus =
  | PaginationStatus
  | 'ErrorFirstPage' // First page failed to load
  | 'ErrorLoadingMore';
export interface PaginatedQueryResult<Item> {
  results: ReadonlyArray<Item>;
  status: PaginationStatus;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
}

export type ApiReturn<T extends FunctionReference<any>> =
  T extends FunctionReference<any, any, any, infer Return> ? Return : never;

export type ApiPaginatedReturn<T extends FunctionReference<any>> =
  T extends FunctionReference<any, any, any, infer Return>
    ? Return extends { page: infer Page }
      ? Page extends Array<infer Item>
        ? NonNullable<Item>
        : never
      : never
    : never;

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
  | 'ModalDeleteCategory'
  | 'ModalAddMemberRoles'
  | 'ModalCreateInviteChannel'
  | 'ModalActionInvite'
  | 'ModalUserDetails'
  | 'ModalInviteToServer'
  | 'ModalConfirmLogout'
  | 'ModalUploadFile';

export type PaginationMode = 'offset' | 'button-load-more' | 'infinite-scroll';
export type ActionInvite = 'revoke' | 'delete' | 'activate';
export type ActionInviteConfig = {
  title: DictKey;
  description: DictKey;
  variant: 'default' | 'destructive';
};

export type IntegrationStep = {
  id: 'webhooks' | 'bots';
  step: number;
};

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

export type CategoryWithPermissions = NonNullable<
  ApiReturn<typeof api.servers.getServerCategories>
>[number];

export type RenderItem =
  | {
      type: 'category';
      category: CategoryWithPermissions;
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

export type CategoryMenuNav<T extends string> = {
  key: T;
  label: DictKey;
  icon: TablerIcon | LucideIcon;
};

export type SettingsCategoryMenuNav =
  CategoryMenuNav<SettingsUserNavItemsKey> & {
    group: SettingsUserNavItemsGroup;
  };

export type CategoryMenuItem<T extends string> = CategoryMenuNav<T> & {
  action: CategoryMenuItemKey;
};

export type TranslateTextKey = {
  value: DictKey;
  params?: Record<string, string | number>;
};
export type ChannelManageNavItemsKey =
  | 'general'
  | 'permissions'
  | 'integrations'
  | 'invite'
  | 'delete';
export type SettingsUserNavItemsKey =
  | 'my-account'
  | 'authorized-apps'
  | 'devices'
  | 'notifications'
  | 'nitro'
  | 'gift-cards'
  | 'logout';
export type SettingsUserNavItemsGroup =
  | 'userSettings'
  | 'billingSettings'
  | 'appSettings'
  | 'dangerZone';
export type CategoryMenuItemKey = 'markAsRead' | 'edit' | 'delete';
export type CategoryManageNavItemsKey = 'general' | 'permissions' | 'delete';
export type SearchFriendsType = 'online' | 'all' | 'pending';
export type UserDetailsTabKey = 'activity' | 'friend' | 'server';
export type ActionParams =
  | 'add-friend'
  | 'pending-friend-requests'
  | 'all-friends'
  | 'online-friends';

export type UserDetailsTabType = {
  label: TranslateTextKey;
  key: UserDetailsTabKey;
};

export type GetUserDetailsTabType = {
  commonFriends?: number;
  commonServers?: number;
};

export type FriendContextAction =
  | 'add_friend'
  | 'remove_friend'
  | 'block'
  | 'start_dm'
  | 'message'
  | 'call'
  | 'profile'
  | 'invite_server';

export type FriendContextItem = {
  key: string;
  label: DictKey;
  icon: TablerIcon | LucideIcon;
  action: FriendContextAction;
};

export type HeaderLeftType = 'direct' | 'group' | 'server';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
  url: string;
  id: string;
};

export type FileWithPreview = {
  file: File;
  id: string;
  preview?: string;
};
