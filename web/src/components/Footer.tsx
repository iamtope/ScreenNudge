import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/messages/en';
import { fmt } from '@/i18n/getDictionary';
import { site } from '@/config/site';
import { BrandMark } from './Icons';

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { footer, nav } = dict;

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link href={`/${locale}`} className="brand">
              <BrandMark className="brand__mark" color="#d7c18e" />
              <span className="brand__word">ScreenNudge</span>
            </Link>
            <p className="footer__tagline">{footer.tagline}</p>
          </div>

          <div className="footer__col">
            <h4>{footer.sectionsLabel}</h4>
            <ul>
              <li><Link href={`/${locale}`}>{nav.about}</Link></li>
              <li><Link href={`/${locale}/faq`}>{nav.faq}</Link></li>
              <li><Link href={`/${locale}/contact`}>{nav.contact}</Link></li>
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>{fmt(footer.rights, { year: site.copyrightYear })}</span>
          <span>{fmt(footer.builtFor, { ios: site.minIOS })}</span>
          <span className="footer__legal">{footer.legalNote}</span>
        </div>
      </div>
    </footer>
  );
}
