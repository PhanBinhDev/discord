'use client';

import Translate from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { i18n, Locale } from '@/internationalization/i18n-config';
import { IconCheck } from '@tabler/icons-react';
import Image from 'next/image';

const languageNames: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

const languageFlags: Record<Locale, string> = {
  en: '/flags/en.png',
  vi: '/flags/vi.png',
};

interface ChangeLanguageProps {
  mode?: 'toggle' | 'dropdown';
}

export function ChangeLanguage({ mode = 'dropdown' }: ChangeLanguageProps) {
  const { locale: currentLocale, setLocale } = useClientDictionary();

  if (mode === 'toggle') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative cursor-pointer"
        onClick={() => {
          const nextLocale = currentLocale === 'en' ? 'vi' : 'en';
          setLocale(nextLocale);
        }}
      >
        <Image
          src={languageFlags[currentLocale]}
          alt={languageNames[currentLocale]}
          width={24}
          height={18}
          className="rounded-sm"
        />
        <span className="sr-only">
          <Translate value="common.changeLanguage" />
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          <Image
            src={languageFlags[currentLocale]}
            alt={languageNames[currentLocale]}
            width={24}
            height={18}
            className="rounded-sm"
          />
          <span className="sr-only">
            <Translate value="common.changeLanguage" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 flex flex-col gap-1 p-1.5"
      >
        {i18n.locales.map(locale => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setLocale(locale)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentLocale === locale ? 'bg-accent' : ''
            }`}
          >
            <Image
              src={languageFlags[locale]}
              alt={languageNames[locale]}
              width={20}
              height={15}
              className="rounded-sm object-cover"
            />
            <span>{languageNames[locale]}</span>
            {currentLocale === locale && (
              <IconCheck className="ml-auto text-muted-foreground" size={16} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
