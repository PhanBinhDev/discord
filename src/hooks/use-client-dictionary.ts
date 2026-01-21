import { DictionaryContext } from '@/providers/dictionary-provider';
import { useContext } from 'react';

export function useClientDictionary() {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error(
      'useClientDictionary must be used within DictionaryProvider',
    );
  }
  return context;
}
