import { Locale } from '@/internationalization/i18n-config';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noIndex?: boolean;
  canonical?: string;
  locale?: Locale;
}

export interface SiteConfig {
  siteName: Record<Locale, string>;
  siteUrl: string;
  defaultTitle: Record<Locale, string>;
  defaultDescription: Record<Locale, string>;
  defaultImage: string;
  twitterHandle?: string;
  author?: string;
}
