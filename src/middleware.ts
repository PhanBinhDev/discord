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

const isPublicRoute = createRouteMatcher(['/home']);

export default clerkMiddleware(async (auth, req) => {
  const localizationResponse = localizationMiddleware(req);

  if (localizationResponse && localizationResponse.status === 307) {
    return localizationResponse;
  }

  const { userId } = await auth();

  if (userId && isPublicRoute(req)) {
    const dashboardUrl = new URL('/', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (!userId && !isPublicRoute(req)) {
    const homeUrl = new URL('/home', req.url);
    homeUrl.searchParams.set('sign-in', 'true');
    homeUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(homeUrl);
  }

  return localizationResponse || NextResponse.next();
});
