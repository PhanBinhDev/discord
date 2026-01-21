import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { i18n, Locale } from './i18n-config';

function getLocale(request: NextRequest) {
  // Lấy từ cookie
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && i18n.locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // Fallback sang Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0]?.split('-')[0];
    if (preferredLocale && i18n.locales.includes(preferredLocale as Locale)) {
      return preferredLocale;
    }
  }

  return i18n.defaultLocale;
}

export function localizationMiddleware(request: NextRequest) {
  const locale = getLocale(request);

  const response = NextResponse.next();

  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', locale, {
      path: '/',
      maxAge: 31536000,
    });
  }

  return response;
}
