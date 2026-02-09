import type { Locale } from './i18n-config';

export const dictionaries = {
  en: () => import('./dictionaries/en').then(module => module.default),
  vi: () => import('./dictionaries/vi').then(module => module.default),
};

export const getDictionary = async (locale: Locale) =>
  dictionaries[locale]?.() ?? dictionaries['en']();

export type Dict = Awaited<ReturnType<typeof getDictionary>>;

type DictKeys<T, K extends string = ''> = T extends object
  ? {
      [P in keyof T]: P extends string
        ? T[P] extends object
          ? DictKeys<T[P], K extends '' ? P : `${K}.${P}`>
          : K extends ''
            ? P
            : `${K}.${P}`
        : never;
    }[keyof T]
  : never;

export type DictKey = DictKeys<Dict>;

export const getDictValue = (dict: Dict | null, key: DictKey): string => {
  if (!dict) return key;

  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = dict;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
};
