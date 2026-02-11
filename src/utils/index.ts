/* eslint-disable @typescript-eslint/no-explicit-any */
import { Doc, Id, TableNames } from '@/convex/_generated/dataModel';
import { Dict } from '@/internationalization/get-dictionaries';
import { ChannelWithCategory, FlattenedItem, NavItem, TreeItem } from '@/types';

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

export function buildTree(
  categories: Doc<'channelCategories'>[],
  channels: ChannelWithCategory[],
): TreeItem[] {
  const tree: TreeItem[] = [];

  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position,
  );

  const channelsByCategory = new Map<string, ChannelWithCategory[]>();
  const uncategorizedChannels: ChannelWithCategory[] = [];

  channels.forEach(channel => {
    if (channel.category) {
      const categoryId = channel.category._id;
      if (!channelsByCategory.has(categoryId)) {
        channelsByCategory.set(categoryId, []);
      }
      channelsByCategory.get(categoryId)!.push(channel);
    } else {
      uncategorizedChannels.push(channel);
    }
  });

  channelsByCategory.forEach(chans => {
    chans.sort((a, b) => a.position - b.position);
  });

  uncategorizedChannels.sort((a, b) => a.position - b.position);

  let globalPosition = 0;

  sortedCategories.forEach(category => {
    const categoryChannels = channelsByCategory.get(category._id) || [];

    const categoryItem: TreeItem = {
      id: category._id,
      type: 'category',
      data: category,
      position: globalPosition++,
      children: categoryChannels.map((channel, idx) => ({
        id: channel._id,
        type: 'channel',
        data: channel,
        position: idx,
        parentId: category._id,
      })),
    };

    tree.push(categoryItem);
  });

  uncategorizedChannels.forEach(channel => {
    tree.push({
      id: channel._id,
      type: 'channel',
      data: channel,
      position: globalPosition++,
    });
  });

  return tree;
}

export function flattenTree(
  tree: TreeItem[],
  collapsedIds: Set<string> = new Set(),
): FlattenedItem[] {
  const flattened: FlattenedItem[] = [];

  function flatten(items: TreeItem[], depth = 0) {
    items.forEach(item => {
      const currentIndex = flattened.length;

      flattened.push({
        ...item,
        depth,
        index: currentIndex,
      });

      if (item.children && !collapsedIds.has(item.id)) {
        flatten(item.children, depth + 1);
      }
    });
  }

  flatten(tree);
  return flattened;
}

export function applyOptimisticMove(
  tree: TreeItem[],
  activeId: Id<TableNames>,
  overId: Id<TableNames>,
  overType: 'category' | 'channel',
  overParentId?: Id<TableNames>,
): TreeItem[] {
  const clonedTree = JSON.parse(JSON.stringify(tree)) as TreeItem[];

  let activeItem: TreeItem | null = null;
  let activeParent: TreeItem | null = null;
  let activeIndex = -1;

  for (let i = 0; i < clonedTree.length; i++) {
    if (clonedTree[i].id === activeId) {
      activeItem = clonedTree[i];
      activeIndex = i;
      break;
    }

    if (clonedTree[i].children) {
      const childIndex = clonedTree[i].children!.findIndex(
        c => c.id === activeId,
      );
      if (childIndex !== -1) {
        activeItem = clonedTree[i].children![childIndex];
        activeParent = clonedTree[i];
        activeIndex = childIndex;
        break;
      }
    }
  }

  if (!activeItem) return tree;

  if (activeParent) {
    activeParent.children = activeParent.children!.filter(
      c => c.id !== activeId,
    );
  } else {
    clonedTree.splice(activeIndex, 1);
  }

  if (overType === 'category' && activeItem.type === 'channel') {
    const categoryIndex = clonedTree.findIndex(item => item.id === overId);
    if (categoryIndex !== -1) {
      if (!clonedTree[categoryIndex].children) {
        clonedTree[categoryIndex].children = [];
      }
      clonedTree[categoryIndex].children!.push(activeItem);
      activeItem.parentId = overId;
    }
  } else if (overType === 'channel') {
    if (overParentId) {
      const parentIndex = clonedTree.findIndex(
        item => item.id === overParentId,
      );
      if (parentIndex !== -1 && activeItem.type === 'channel') {
        const overIndex = clonedTree[parentIndex].children!.findIndex(
          c => c.id === overId,
        );
        if (overIndex !== -1) {
          clonedTree[parentIndex].children!.splice(overIndex, 0, activeItem);
          activeItem.parentId = overParentId;
        }
      }
    } else {
      const overIndex = clonedTree.findIndex(item => item.id === overId);
      if (overIndex !== -1) {
        clonedTree.splice(overIndex, 0, activeItem);
        delete activeItem.parentId;
      }
    }
  }

  return clonedTree;
}

export function getTreeSignature(tree: TreeItem[]): string {
  const positions = tree.map(item => {
    if (item.children) {
      return `${item.id}:${item.position}:[${item.children.map(c => `${c.id}:${c.position}`).join(',')}]`;
    }
    return `${item.id}:${item.position}`;
  });
  return positions.join('|');
}

export function generateInviteCode(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const getUsernameDisplay = (user: {
  username: string;
  discriminator: string;
}) => {
  return `${user.username}#${user.discriminator}`;
};
