'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DEFAULT_LIMIT } from '@/constants/app';
import { PaginationMode } from '@/types';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Table as TableType,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';
import { DataTablePagination } from './data-table-pagination';

interface DataTableOptions<TData> {
  paginations?: boolean;
  paginationType?: PaginationMode;
  paginationButton?: React.ReactNode;
  toolbar?: React.ComponentType<{ table: TableType<TData> }> | false;
  loading?: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  options?: DataTableOptions<TData>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  options = {
    paginations: true,
    paginationType: 'offset',
    loading: false,
  },
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: DEFAULT_LIMIT,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const CustomToolbar = options.toolbar;

  return (
    <div className="flex flex-col gap-4">
      {CustomToolbar && <CustomToolbar table={table} />}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {options.loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {columns.map((_, cellIndex) => {
                    const widths = ['w-full', 'w-3/4', 'w-2/3', 'w-1/2'];
                    const width = widths[cellIndex % widths.length];
                    return (
                      <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
                        <Skeleton
                          className={`h-5 ${width} rounded bg-background/20`}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <TranslateText value="common.noResultsFound" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {options.paginations && (
        <>
          {options.paginationType === 'offset' && (
            <DataTablePagination table={table} />
          )}
          {options.paginationType === 'button-load-more' && (
            <>{options.paginationButton}</>
          )}
        </>
      )}
    </div>
  );
}
