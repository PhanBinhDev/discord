/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dict } from '@/internationalization/get-dictionaries';
import { NavItem } from '@/types';

export function getByPath(
  obj: Dict | undefined | null,
  path: string,
): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export const getInitials = (name: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exactMatch) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(item.href + '/');
}
