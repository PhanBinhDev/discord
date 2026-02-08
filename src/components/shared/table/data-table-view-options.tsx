/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { type Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DictKey } from '@/internationalization/get-dictionaries';

export function DataTableViewOptions<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-muted-foreground/10"
        >
          <Settings2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>
          <TranslateText value="common.table.toggleColumns" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            column =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide(),
          )
          .map(column => {
            const translationKey = (column.columnDef.meta as any)
              ?.translationKey as DictKey | undefined;

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={value => column.toggleVisibility(!!value)}
              >
                {translationKey ? (
                  <TranslateText value={translationKey} />
                ) : (
                  column.id
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim()
                )}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
