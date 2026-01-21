import {
  DictKey,
  getDictionary,
} from '@/internationalization/get-dictionaries';
import { i18n, Locale } from '@/internationalization/i18n-config';
import { getByPath } from '@/utils';

import { cookies } from 'next/headers';

type TranslateTextServerProps = {
  value: DictKey;
  params?: Record<string, string | number>;
};

export async function TranslateTextServer({
  value,
  params,
}: TranslateTextServerProps) {
  const cookieStore = await cookies();
  const locale =
    (cookieStore.get('locale')?.value as Locale) ?? i18n.defaultLocale;
  const dict = await getDictionary(locale);
  let translated = getByPath(dict, value) ?? value;

  if (params && typeof translated === 'string') {
    Object.entries(params).forEach(([key, val]) => {
      translated = (translated as string).replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(val),
      );
    });
  }

  return <>{translated}</>;
}
