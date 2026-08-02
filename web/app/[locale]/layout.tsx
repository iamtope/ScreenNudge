import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import '../globals.css';
import { locales, isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const title = 'ScreenNudge — come back before the scroll takes over';
const description =
  'ScreenNudge is the iPhone screen-time app that creates a moment of intention before you open distracting apps — backed by a circle of friends who help you stick with it.';

export const metadata: Metadata = {
  title: { default: title, template: '%s · ScreenNudge' },
  description,
  applicationName: 'ScreenNudge',
  icons: { icon: '/favicon.svg' },
  openGraph: { title, description, type: 'website', siteName: 'ScreenNudge' },
  twitter: { card: 'summary_large_image', title, description },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  return (
    <html lang={locale}>
      <body>
        <Header locale={locale as Locale} nav={dict.nav} a11y={dict.a11y} />
        <main>{children}</main>
        <Footer locale={locale as Locale} dict={dict} />
      </body>
    </html>
  );
}
