import { NextRequest, NextResponse } from 'next/server';

// Inlined (not imported) so the Edge middleware bundle is fully self-contained.
// Importing from src/i18n/config failed to resolve/load in Vercel's Edge runtime
// (MIDDLEWARE_INVOCATION_FAILED). Keep this list in sync with src/i18n/config.ts.
const locales = ['en', 'nl', 'fr', 'de', 'zh', 'it', 'tr'] as const;
const defaultLocale = 'en';
function isLocale(value: string): boolean {
  return (locales as readonly string[]).includes(value);
}

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
