import { type Column } from '@tanstack/react-table';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { DictKey, getDictValue } from '@/internationalization/get-dictionaries';
import { cn } from '@/lib/utils';
import { IconCheck, TablerIcon } from '@tabler/icons-react';

interface DataTableColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title: DictKey;
  options: {
    label: DictKey;
    value: string | boolean;
    icon?: TablerIcon;
  }[];
}

export function DataTableColumnFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableColumnFilterProps<TData, TValue>) {
  const { dict } = useClientDictionary();
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(
    column?.getFilterValue() as (string | boolean)[],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 data-[state=open]:bg-accent relative"
        >
          <span>
            <TranslateText value={title} />
          </span>
          <div
            className={cn(
              'p-1 size-4.5 text-[10px] leading-2.5 text-destructive',
              selectedValues?.size > 0 &&
                'bg-destructive text-destructive-foreground rounded-md',
            )}
          >
            {selectedValues?.size > 0 && selectedValues.size}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={getDictValue(dict, title)} />
          <CommandList>
            <CommandEmpty>
              <TranslateText value="common.noResultsFound" />
            </CommandEmpty>
            <CommandGroup>
              {options.map(option => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={String(option.value)}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined,
                      );
                    }}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-lg border',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input [&_svg]:invisible',
                      )}
                    >
                      <IconCheck className="text-primary-foreground size-3.5" />
                    </div>
                    {option.icon && (
                      <option.icon className="text-muted-foreground size-4" />
                    )}
                    <span>
                      <TranslateText value={option.label} />
                    </span>
                    {facets?.get(option.value) && (
                      <span className="text-muted-foreground ml-auto flex size-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    <TranslateText value="common.table.clearFilters" />
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
