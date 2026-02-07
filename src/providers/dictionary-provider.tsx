'use client';

import { Dict } from '@/internationalization/get-dictionaries';
import { i18n, Locale } from '@/internationalization/i18n-config';
import { setLocaleAction } from '@/internationalization/set-locale-server';
import { useDictionaryStore } from '@/lib/dictionary-store';
import { getCookieLocale } from '@/utils/cookies';
import { useRouter } from 'next/navigation';
import { createContext, useEffect, useState, useTransition } from 'react';

type DictionaryContextType = {
  dict: Dict | null;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
};

export const DictionaryContext = createContext<
  DictionaryContextType | undefined
>(undefined);

export function DictionaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setDictStore } = useDictionaryStore();
  const [isPending, startTransition] = useTransition();
  const defaultLocale = (getCookieLocale() as Locale) ?? i18n.defaultLocale;
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dict, setDict] = useState<Dict | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    import(`@/internationalization/dictionaries/${locale}`)
      .then(m => {
        if (mounted) {
          console.log('Dictionary loaded successfully:', locale);
          const loadedDict = m.default ?? m;
          setDict(loadedDict);
          setDictStore(loadedDict, locale);
          setIsLoading(false);
        }
      })
      .catch(error => {
        console.error('Failed to load dictionary:', error);
        if (mounted) {
          setDict(null);
          setDictStore(null, locale);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [locale, setDictStore]);

  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    setLocaleState(newLocale);

    startTransition(async () => {
      await setLocaleAction(newLocale);
      router.refresh();
    });
  };

  return (
    <DictionaryContext.Provider
      value={{ dict, locale, setLocale, isLoading: isPending || isLoading }}
    >
      {children}
    </DictionaryContext.Provider>
  );
}
