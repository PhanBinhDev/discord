import { PaginationStateContext } from '@/providers/pagination-state-provider';
import { useContext } from 'react';

export function usePaginationStateContext() {
  const context = useContext(PaginationStateContext);
  if (!context) {
    throw new Error(
      'usePaginationStateContext must be used within PaginationStateProvider',
    );
  }
  return context;
}
