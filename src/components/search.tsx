'use client';

import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { Input } from './ui/input';

const SearchGlobal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [] = useDebounceValue(searchTerm, 300);

  const { dict } = useClientDictionary();

  // TODO: Implement search functionality

  return (
    <div className="relative w-full">
      <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={dict?.common.searchPlaceholder}
        className="w-full pl-10"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

export default SearchGlobal;
