import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { site } from '@/config/site';
import { Rich } from '@/components/Rich';
import { ContactForm } from '@/components/ContactForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  return { title: getDictionary(locale).nav.contact };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = getDictionary(locale);
  const t = dict.contact;

  return (
    <section className="section">
      <div className="container">
        <div className="sec-head sec-head--center">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="h1">
            <Rich text={t.title} />
          </h1>
          <p className="lead" style={{ marginInline: 'auto', marginTop: 18 }}>
            {t.subhead}
          </p>
        </div>

        <div className="contact-grid">
          <div>
            <ContactForm form={t.form} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="contact-card">
              <h3>{t.emailHeading}</h3>
              <a className="contact-email" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              <p className="form-hint" style={{ marginTop: 10 }}>
                {t.responseNote}
              </p>
            </div>

            <div className="contact-card">
              <h3>{t.faqHeading}</h3>
              <Link href={`/${locale}/faq`} className="btn btn-ghost" style={{ marginTop: 4 }}>
                {t.faqLink}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
