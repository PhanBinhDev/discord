import { Locale } from '@/internationalization/i18n-config';
import { Metadata } from 'next';
import { siteConfig } from './config';
import { SEOConfig } from './types';

export function generateMetadata(
  config: SEOConfig = {},
  locale: Locale = 'en',
): Metadata {
  const {
    title = siteConfig.defaultTitle[locale],
    description = siteConfig.defaultDescription[locale],
    image = siteConfig.defaultImage,
    url,
    type = 'website',
    publishedTime,
    modifiedTime,
    author = siteConfig.author,
    section,
    tags,
    noIndex = false,
    canonical,
  } = config;

  // Construct full URL for image
  const imageUrl = image.startsWith('http')
    ? image
    : `${siteConfig.siteUrl}${image}`;

  // Construct page URL with locale
  const pageUrl = url
    ? `${siteConfig.siteUrl}/${locale}${url}`
    : `${siteConfig.siteUrl}/${locale}`;

  // Construct canonical URL
  const canonicalUrl = canonical
    ? `${siteConfig.siteUrl}${canonical}`
    : pageUrl;

  // Generate alternate language URLs
  const alternateLanguages: Record<string, string> = {};
  if (url) {
    alternateLanguages['en'] = `${siteConfig.siteUrl}/en${url}`;
    alternateLanguages['vi'] = `${siteConfig.siteUrl}/vi${url}`;
    alternateLanguages['x-default'] = `${siteConfig.siteUrl}/en${url}`;
  }

  const metadata: Metadata = {
    title,
    description,
    applicationName: siteConfig.siteName[locale],

    // Robots
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },

    // Open Graph
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: siteConfig.siteName[locale],
      locale,
      type: (type === 'product' ? 'website' : type) as
        | 'website'
        | 'article'
        | 'profile',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        authors: author ? [author] : undefined,
        section,
        tags,
      }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: siteConfig.twitterHandle,
    },

    // Alternates (canonical + i18n)
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
  };

  return metadata;
}
