import { Locale } from '@/internationalization/i18n-config';
import { siteConfig } from './config';

export interface ArticleJsonLdProps {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  url: string;
  locale: Locale;
}

export function generateArticleJsonLd(props: ArticleJsonLdProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    image: props.image.startsWith('http')
      ? props.image
      : `${siteConfig.siteUrl}${props.image}`,
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    inLanguage: props.locale,
    author: {
      '@type': 'Person',
      name: props.authorName,
      ...(props.authorUrl && { url: props.authorUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.siteName[props.locale],
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.siteUrl}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.siteUrl}/${props.locale}${props.url}`,
    },
  };
}

export interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
  rating?: {
    value: number;
    count: number;
  };
  locale: Locale;
}

export function generateProductJsonLd(props: ProductJsonLdProps) {
  const imageUrl = props.image.startsWith('http')
    ? props.image
    : `${siteConfig.siteUrl}${props.image}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.name,
    description: props.description,
    image: imageUrl,
    inLanguage: props.locale,
    ...(props.brand && { brand: { '@type': 'Brand', name: props.brand } }),
    ...(props.sku && { sku: props.sku }),
    offers: {
      '@type': 'Offer',
      price: props.price,
      priceCurrency: props.currency,
      availability: `https://schema.org/${props.availability || 'InStock'}`,
      url: siteConfig.siteUrl,
    },
    ...(props.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: props.rating.value,
        reviewCount: props.rating.count,
      },
    }),
  };
}

export interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string;
    url: string;
  }>;
  locale: Locale;
}

export function generateBreadcrumbJsonLd(props: BreadcrumbJsonLdProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: props.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteConfig.siteUrl}/${props.locale}${item.url}`,
    })),
  };
}

export function generateWebsiteJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.siteName[locale],
    url: `${siteConfig.siteUrl}/${locale}`,
    description: siteConfig.defaultDescription[locale],
    inLanguage: locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.siteUrl}/${locale}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
