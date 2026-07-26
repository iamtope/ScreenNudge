import type { Metadata } from 'next';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { Rich } from '@/components/Rich';
import { ChevronDown } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  return { title: getDictionary(locale).nav.faq };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale).faq;

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

        <div className="faq-list">
          {t.items.map((item, i) => (
            <details key={i} className="faq-item">
              <summary>
                <span>{item.q}</span>
                <ChevronDown className="chev" />
              </summary>
              <p className="faq-item__body">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
