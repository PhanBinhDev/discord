'use server';

import { Locale } from '@/internationalization/i18n-config';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function setLocaleAction(locale: Locale) {
  const cookieStore = await cookies();

  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 31536000,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}
