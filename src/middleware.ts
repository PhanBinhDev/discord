import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { localizationMiddleware } from './internationalization/localization-middleware';

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/api/:path*',
  ],
};

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/servers(.*)',
  '/calls(.*)',
  '/meetings(.*)',
  '/chat(.*)',
  '/contacts(.*)',
]);

// Public routes (only for non-authenticated users)
const isPublicOnlyRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  const localizationResponse = localizationMiddleware(req);

  if (localizationResponse && localizationResponse.status === 307) {
    return localizationResponse;
  }

  const { userId } = await auth();

  if (userId && isPublicOnlyRoute(req)) {
    const dashboardUrl = new URL('/servers', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (!userId && isProtectedRoute(req)) {
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('sign-in', 'true');
    homeUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(homeUrl);
  }

  return localizationResponse || NextResponse.next();
});
