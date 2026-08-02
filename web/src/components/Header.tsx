'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/messages/en';
import { getAppHref } from '@/config/site';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark, Menu, Close } from './Icons';

export function Header({
  locale,
  nav,
  a11y,
}: {
  locale: Locale;
  nav: Dictionary['nav'];
  a11y: Dictionary['a11y'];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: `/${locale}`, label: nav.about, exact: true },
    { href: `/${locale}/faq`, label: nav.faq, exact: false },
    { href: `/${locale}/contact`, label: nav.contact, exact: false },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link href={`/${locale}`} className="brand" aria-label={a11y.home}>
          <BrandMark className="brand__mark" />
          <span className="brand__word">ScreenNudge</span>
        </Link>

        <nav className="header__nav" data-open={open} aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="navlink"
              aria-current={isActive(link.href, link.exact) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <span className="header__spacer" />

        <div className="header__actions">
          <LanguageSwitcher current={locale} label={a11y.chooseLanguage} />
          <Link href={getAppHref(locale)} className="btn btn-primary header__cta">
            {nav.cta}
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-label={open ? a11y.closeMenu : a11y.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
