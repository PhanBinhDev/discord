import { DictKey } from '@/internationalization/get-dictionaries';
import { TablerIcon } from '@tabler/icons-react';

export type NavItem = {
  name: string;
  href: string;
  icon: TablerIcon;
  translationKey: DictKey;
  badge?: number;
  exactMatch?: boolean;
};

export type ModalType = 'ModalCreateServer' | 'ModalCreateDirectMessage';

export type PaginationMode = 'offset' | 'button-load-more' | 'infinite-scroll';

export type Point = {
  x: number;
  y: number;
};
