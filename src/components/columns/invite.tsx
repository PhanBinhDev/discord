'use client';

import { Doc } from '@/convex/_generated/dataModel';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/shared/table/data-table-column-header';
import { DataTableViewOptions } from '@/components/shared/table/data-table-view-options';
import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconCopy, IconTrash } from '@tabler/icons-react';
import moment from 'moment';

export const columns: ColumnDef<Doc<'serverInvites'>>[] = [
  {
    accessorKey: 'inviter',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.inviter',
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        label={
          <TranslateText value="servers.channel.edit.invite.columns.inviter" />
        }
      />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      const inviter = row.getValue('inviter') as {
        displayName?: string;
        username?: string;
        avatarUrl?: string;
      } | null;

      if (!inviter) {
        return (
          <span className="truncate text-muted-foreground">
            <TranslateText value="common.unknown" />
          </span>
        );
      }

      return (
        <div className="flex items-center gap-2 truncate">
          <UserAvatar
            src={inviter.avatarUrl}
            name={inviter.displayName || inviter.username}
            size={8}
          />
          <span className="truncate font-medium">
            {inviter.displayName || inviter.username}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'code',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.code',
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        label={
          <TranslateText value="servers.channel.edit.invite.columns.code" />
        }
      />
    ),
    cell: ({ row }) => {
      const code = row.getValue('code') as string;
      return (
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {code}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/invite/${code}`,
              );
              // TODO: Show toast
            }}
          >
            <IconCopy className="size-4" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'uses',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.uses',
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        label={
          <TranslateText value="servers.channel.edit.invite.columns.uses" />
        }
      />
    ),
    cell: ({ row }) => {
      const uses = row.getValue('uses') as number;
      const maxUses = row.original.maxUses;
      return (
        <span className="text-sm">
          {uses}
          {maxUses ? ` / ${maxUses}` : ''}
        </span>
      );
    },
  },
  {
    accessorKey: 'expiresAt',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.expires',
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        label={
          <TranslateText value="servers.channel.edit.invite.columns.expires" />
        }
      />
    ),
    cell: ({ row }) => {
      const expiresAt = row.getValue('expiresAt') as number | undefined;
      const status = row.original.status;

      if (!expiresAt) {
        return (
          <Badge variant="outline">
            <TranslateText value="servers.channel.edit.invite.columns.neverExpires" />
          </Badge>
        );
      }

      const isExpired = expiresAt < Date.now() || status === 'expired';

      return (
        <div className="flex flex-col gap-1">
          <span
            className={`text-sm ${
              isExpired ? 'text-muted-foreground line-through' : ''
            }`}
          >
            {moment(expiresAt).format('lll')}
          </span>
          {isExpired && (
            <Badge variant="destructive" className="w-fit">
              <TranslateText value="servers.channel.edit.invite.columns.expired" />
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    meta: {
      headerClassName: 'pr-1',
    },
    header: ({ table }) => {
      return (
        <div className="flex items-center justify-end">
          <DataTableViewOptions table={table} />
        </div>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              // TODO: Handle revoke invite
              console.log('Revoke invite:', row.original._id);
            }}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      );
    },
  },
];
