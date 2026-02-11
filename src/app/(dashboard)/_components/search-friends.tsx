'use client';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { IconSearch } from '@tabler/icons-react';
import { memo } from 'react';

interface SearchFriendsProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchFriends = memo(({ value, onChange }: SearchFriendsProps) => {
  const { dict } = useClientDictionary();

  return (
    <InputGroup>
      <InputGroupAddon>
        <IconSearch />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={dict?.common.searchPlaceholder}
      />
    </InputGroup>
  );
});

SearchFriends.displayName = 'SearchFriends';

export default SearchFriends;
