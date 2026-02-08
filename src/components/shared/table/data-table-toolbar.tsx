'use client';

import { type Table } from '@tanstack/react-table';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconX } from '@tabler/icons-react';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterKey?: string;
  filterPlaceholder?: string;
}

export function DataTableToolbar<TData>({
  table,
  filterKey = 'title',
  filterPlaceholder = 'Filter...',
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={filterPlaceholder}
          value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
          onChange={event =>
            table.getColumn(filterKey)?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title="Status"
            options={statuses}
          />
        )}
        {table.getColumn('priority') && (
          <DataTableFacetedFilter
            column={table.getColumn('priority')}
            title="Priority"
            options={priorities}
          />
        )} */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            <TranslateText value="common.reset" />
            <IconX size={16} />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
