import '@/styles/globals.css';
import { enUS, viVN } from '@clerk/localizations';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Noto_Sans } from 'next/font/google';

const notoSans = Noto_Sans({ subsets: ['latin'] });

import AuthRedirect from '@/components/shared/auth-redirect';
import { ClearRedirectAfterLogin } from '@/components/shared/clear-redirect-after-signin';
import PageLoader from '@/components/shared/loader';
import MultisessionAppSupport from '@/components/shared/multi-sessions';
import { i18n, Locale } from '@/internationalization/i18n-config';
import { generateMetadata as generateMeta } from '@/lib/seo';
import { ConvexClientProvider } from '@/providers/convex-client-provider';
import { DictionaryProvider } from '@/providers/dictionary-provider';
import ModalsProvider from '@/providers/modal-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale =
    (cookieStore.get('locale')?.value as Locale) ?? i18n.defaultLocale;
  return generateMeta({}, locale);
}

export default async function RootLayout({ children }: Readonly<IChildren>) {
  const cookieStore = await cookies();
  const locale =
    (cookieStore.get('locale')?.value as Locale) ?? i18n.defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <ClerkProvider
        localization={locale === 'vi' ? viVN : enUS}
        appearance={{
          variables: {
            borderRadius: '6px',
            fontFamily: "'Inter', sans-serif",
          },
          elements: {
            card: '!py-6 !px-8',
            footer: '!hidden',
            socialButtons: '!flex flex-col gap-3',
            buttonArrowIcon: '!hidden',
            logoImage: 'rounded-md',
            main: '!gap-2',
            modalCloseButton: 'focus:!shadow-none',
            modalBackdrop: '!items-center',
            formButtonPrimary:
              '!bg-linear-to-r from-blue-600 to-purple-600 !hover:from-blue-700 !hover:to-purple-700 !text-white !rounded-md !hover:shadow-lg !transition-all !shadow-sm !py-2',
            formFieldInput: '!rounded-md !py-2',
            socialButtonsIconButton: '!rounded-md !py-2',
            form: '!gap-3',
          },
        }}
        signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_SIGN_IN_REDIRECT_URL}
        signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_SIGN_UP_REDIRECT_URL}
        signInUrl={process.env.NEXT_PUBLIC_SIGN_IN_URL}
        signUpUrl={process.env.NEXT_PUBLIC_SIGN_UP_URL}
      >
        <body className={`${notoSans.className} antialiased overflow-hidden`}>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <MultisessionAppSupport>
                <DictionaryProvider>
                  <PageLoader>
                    <Suspense fallback={null}>
                      <AuthRedirect />
                    </Suspense>
                    <Toaster
                      richColors={false}
                      toastOptions={{
                        style: {
                          background: 'hsl(var(--background))',
                          color: 'hsl(var(--foreground))',
                          border: '1px solid hsl(var(--border))',
                        },
                        classNames: {
                          success:
                            '!border-[var(--accent-color)]/20 !bg-muted !text-[var(--accent-color)]',
                          error:
                            '!border-red-500/20 !bg-muted !text-red-600 dark:!text-red-500',
                          warning:
                            '!border-yellow-500/20 !bg-muted !text-yellow-600 dark:!text-yellow-500',
                          info: '!border-blue-500/20 !bg-muted !text-blue-600 dark:!text-blue-500',
                        },
                      }}
                    />
                    <ModalsProvider />
                    <Analytics />
                    <SpeedInsights />
                    <ClearRedirectAfterLogin />
                    {children}
                  </PageLoader>
                </DictionaryProvider>
              </MultisessionAppSupport>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
