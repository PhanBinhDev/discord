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
