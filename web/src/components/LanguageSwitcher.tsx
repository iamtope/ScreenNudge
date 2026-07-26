'use client';

import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Globe, ChevronDown } from './Icons';

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const segments = pathname.split('/');
    segments[1] = next; // ['', 'en', 'faq'] → swap the locale segment
    router.push(segments.join('/') || '/');
  }

  return (
    <div className="lang">
      <span className="lang__icon" aria-hidden="true">
        <Globe />
      </span>
      <select value={current} onChange={onChange} aria-label={label}>
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
      <span className="lang__chev" aria-hidden="true">
        <ChevronDown width={14} height={14} />
      </span>
    </div>
  );
}
