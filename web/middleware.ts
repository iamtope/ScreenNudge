import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, isLocale } from '@/i18n/config';

/** Pick the best supported locale from the Accept-Language header. */
function detectLocale(request: NextRequest): string {
  const header = request.headers.get('accept-language');
  if (!header) return defaultLocale;
  const preferred = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase());
  for (const tag of preferred) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals, the API, and files with an extension.
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
