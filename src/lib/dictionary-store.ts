import { Dict } from '@/internationalization/get-dictionaries';
import { Locale } from '@/internationalization/i18n-config';
import { create } from 'zustand';

interface DictionaryStore {
  dictStore: Dict | null;
  locale: Locale;
  setDictStore: (dict: Dict | null, locale: Locale) => void;
}

export const useDictionaryStore = create<DictionaryStore>(set => ({
  dictStore: null,
  locale: 'en',
  setDictStore: (dict, locale) => set({ dictStore: dict, locale }),
}));

export function setGlobalDict(dict: Dict | null, locale: Locale) {
  useDictionaryStore.getState().setDictStore(dict, locale);
}

export function getGlobalDict(): Dict | null {
  return useDictionaryStore.getState().dictStore;
}

export function getGlobalLocale(): Locale {
  return useDictionaryStore.getState().locale;
}
