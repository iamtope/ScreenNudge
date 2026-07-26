import Link from 'next/link';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';
import { getDictionary, fmt } from '@/i18n/getDictionary';
import { site, getAppHref } from '@/config/site';
import { Rich } from '@/components/Rich';
import { PhoneMockup } from '@/components/PhoneMockup';
import { featureIcons, ShieldCheck } from '@/components/Icons';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale).home;
  const appHref = getAppHref(locale);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1 className="h1">
              <Rich text={t.hero.title} />
            </h1>
            <p className="lead hero__sub">{t.hero.subhead}</p>
            <div className="hero__actions">
              <Link href={appHref} className="btn btn-primary">
                {t.hero.ctaPrimary}
              </Link>
              <a href="#how" className="btn btn-ghost">
                {t.hero.ctaSecondary}
              </a>
            </div>
            <div className="hero__tags">
              {t.hero.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="hero__stage">
            <PhoneMockup variant="pause" />
          </div>
        </div>
      </section>

      {/* ---------- PROBLEM ---------- */}
      <section className="section section--tint">
        <div className="container">
          <div className="sec-head sec-head--center">
            <p className="eyebrow">{t.problem.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.problem.title} />
            </h2>
            <p className="lead" style={{ marginInline: 'auto', marginTop: 18 }}>
              {t.problem.body}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section" id="how">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">{t.how.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.how.title} />
            </h2>
          </div>
          <div className="steps">
            {t.how.steps.map((step) => (
              <div key={step.title} className="step">
                <div className="step__num" />
                <h3 className="step__title">{step.title}</h3>
                <p className="step__body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="section section--tint">
        <div className="container">
          <div className="sec-head sec-head--center">
            <p className="eyebrow">{t.features.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.features.title} />
            </h2>
          </div>
          <div className="features">
            {t.features.items.map((item, i) => {
              const Icon = featureIcons[i] ?? featureIcons[0];
              return (
                <div key={item.name} className="feature">
                  <div className="feature__ic">
                    <Icon />
                  </div>
                  <h3 className="feature__name">{item.name}</h3>
                  <p className="feature__body">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- CIRCLE ---------- */}
      <section className="section">
        <div className="container split">
          <div className="split__copy">
            <p className="eyebrow">{t.circle.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.circle.title} />
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              {t.circle.body}
            </p>
          </div>
          <div className="split__stage">
            <PhoneMockup variant="circle" />
          </div>
        </div>
      </section>

      {/* ---------- INSIGHTS ---------- */}
      <section className="section section--tint">
        <div className="container split split--flip">
          <div className="split__copy">
            <p className="eyebrow">{t.insights.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.insights.title} />
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              {t.insights.body}
            </p>
          </div>
          <div className="split__stage">
            <PhoneMockup variant="insights" />
          </div>
        </div>
      </section>

      {/* ---------- PRIVACY ---------- */}
      <section className="section">
        <div className="container">
          <div className="privacy">
            <p className="eyebrow">{t.privacy.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.privacy.title} />
            </h2>
            <div className="privacy__points">
              {t.privacy.points.map((point, i) => (
                <div key={i} className="privacy__point">
                  <ShieldCheck />
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MISSION / ABOUT ---------- */}
      <section className="section section--tint">
        <div className="container">
          <div className="sec-head sec-head--center">
            <p className="eyebrow">{t.mission.eyebrow}</p>
            <h2 className="h2">
              <Rich text={t.mission.title} />
            </h2>
            <p className="lead" style={{ marginInline: 'auto', marginTop: 18 }}>
              {t.mission.body}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="section" id="get">
        <div className="container cta">
          <h2 className="h2">
            <Rich text={t.cta.title} />
          </h2>
          <p className="lead cta__sub">{t.cta.subhead}</p>
          <div className="cta__actions">
            <Link href={appHref} className="btn btn-brass" style={{ fontSize: 16, padding: '14px 26px' }}>
              {t.cta.button}
            </Link>
          </div>
          <p className="cta__note">
            {site.appStore.available ? fmt(t.cta.requirement, { ios: site.minIOS }) : t.cta.soon}
          </p>
        </div>
      </section>
    </>
  );
}
