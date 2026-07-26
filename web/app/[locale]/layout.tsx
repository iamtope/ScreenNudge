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

const title = 'pull — come back before the scroll takes over';
const description =
  'pull is the iPhone screen-time app that puts one calm pause between you and the apps that pull you in — backed by a circle of friends who make it stick.';

export const metadata: Metadata = {
  title: { default: title, template: '%s · pull' },
  description,
  applicationName: 'pull',
  icons: { icon: '/favicon.svg' },
  openGraph: { title, description, type: 'website', siteName: 'pull' },
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
