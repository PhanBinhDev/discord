'use client';

import { Doc, Id } from '@/convex/_generated/dataModel';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTableColumnFilter } from '@/components/shared/table/data-table-column-filter';
import { DataTableColumnHeader } from '@/components/shared/table/data-table-column-header';
import { DataTableViewOptions } from '@/components/shared/table/data-table-view-options';
import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { Dict, DictKey } from '@/internationalization/get-dictionaries';
import { ActionInvite } from '@/types';
import { IconBan, IconCheck, IconCopy, IconTrash } from '@tabler/icons-react';
import moment from 'moment';
import { toast } from 'sonner';

export interface InviteColumnsProps {
  onActionInvite: (inviteId: Id<'serverInvites'>, type: ActionInvite) => void;
  dict: Dict | null;
}

export const createInviteColumns = ({
  onActionInvite,
  dict,
}: InviteColumnsProps): ColumnDef<Doc<'serverInvites'>>[] => [
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
              toast.success(dict?.servers.channel.edit.invite.columns.copied);
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
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.status',
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    header: ({ column }) => (
      <DataTableColumnFilter
        column={column}
        title="servers.channel.edit.invite.columns.status"
        options={[
          {
            label: 'servers.channel.edit.invite.columns.statusValue.active',
            value: 'active',
          },
          {
            label: 'servers.channel.edit.invite.columns.statusValue.expired',
            value: 'expired',
          },
          {
            label: 'servers.channel.edit.invite.columns.statusValue.revoked',
            value: 'revoked',
          },
        ]}
      />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as 'active' | 'expired' | 'revoked';

      const variants = {
        active: 'default',
        expired: 'destructive',
        revoked: 'secondary',
      } as const;

      return (
        <Badge variant={variants[status] || 'outline'}>
          <TranslateText
            value={
              `servers.channel.edit.invite.columns.statusValue.${status}` as DictKey
            }
          />
        </Badge>
      );
    },
  },
  {
    accessorKey: 'temporary',
    meta: {
      translationKey: 'servers.channel.edit.invite.columns.temporary',
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    header: ({ column }) => (
      <DataTableColumnFilter
        column={column}
        title="servers.channel.edit.invite.columns.temporary"
        options={[
          {
            label: 'servers.channel.edit.invite.columns.temporaryValues.yes',
            value: true,
          },
          {
            label: 'servers.channel.edit.invite.columns.temporaryValues.no',
            value: false,
          },
        ]}
      />
    ),
    cell: ({ row }) => {
      const temporary = row.getValue('temporary') as boolean;

      return (
        <Badge variant={temporary ? 'outline' : 'secondary'}>
          <TranslateText
            value={`servers.channel.edit.invite.columns.temporaryValues.${temporary ? 'yes' : 'no'}`}
          />
        </Badge>
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
      const status = row.original.status;
      const inviteId = row.original._id;

      return (
        <div className="flex items-center justify-end gap-2">
          {status === 'revoked' && (
            <Hint
              label={dict?.servers.channel.edit.invite.activateInvite}
              side="top"
              sideOffset={3}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-green-500/10 hover:text-green-600"
                onClick={() => onActionInvite(inviteId, 'activate')}
              >
                <IconCheck className="size-4" />
              </Button>
            </Hint>
          )}

          {status === 'expired' && (
            <Hint
              label={dict?.servers.channel.edit.invite.deleteInvite}
              side="top"
              sideOffset={3}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onActionInvite(inviteId, 'delete')}
              >
                <IconTrash className="size-4" />
              </Button>
            </Hint>
          )}

          {status === 'active' && (
            <Hint
              label={dict?.servers.channel.edit.invite.revokeTitle}
              side="top"
              sideOffset={3}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onActionInvite(inviteId, 'revoke')}
              >
                <IconBan className="size-4" />
              </Button>
            </Hint>
          )}
        </div>
      );
    },
  },
];
