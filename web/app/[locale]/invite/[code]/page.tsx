import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAppHref } from '@/config/site';
import { defaultLocale, isLocale, type Locale } from '@/i18n/config';

type InvitePageProps = {
  params: Promise<{ locale: string; code: string }>;
};

function normalizeInviteCode(value: string): string | null {
  const code = value.trim();
  return /^[a-zA-Z0-9]{6}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = normalizeInviteCode(rawCode);
  const title = 'Join a friend’s circle on ScreenNudge';
  const description =
    'Open this invite in ScreenNudge to join your friend’s circle and stay accountable together.';

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'ScreenNudge',
      url: code ? `https://www.screennudge.com/invite/${code}` : undefined,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { locale: rawLocale, code: rawCode } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const code = normalizeInviteCode(rawCode);

  if (!code) notFound();

  const appLink = `screennudge://invite/${encodeURIComponent(code)}`;

  return (
    <section className="invite-page">
      <div className="container invite-page__inner">
        <div className="invite-card">
          <div className="invite-card__orbit" aria-hidden="true">
            <span className="invite-card__person invite-card__person--left">F</span>
            <span className="invite-card__person invite-card__person--you">You</span>
            <span className="invite-card__person invite-card__person--right">S</span>
          </div>

          <p className="eyebrow">Friend circle invite</p>
          <h1 className="h2">
            You’ve been invited to <em className="accent">ScreenNudge.</em>
          </h1>
          <p className="lead invite-card__lead">
            Open ScreenNudge to join your friend’s circle and help each other come back before the
            scroll takes over.
          </p>

          <div className="invite-code" aria-label={`Invite code ${code}`}>
            <span>Invite code</span>
            <strong>{code}</strong>
          </div>

          <div className="invite-card__actions">
            <a href={appLink} className="btn btn-primary invite-card__button">
              Open ScreenNudge
            </a>
            <Link href={getAppHref(locale)} className="btn btn-ghost invite-card__button">
              Get ScreenNudge
            </Link>
          </div>

          <p className="invite-card__note">
            If ScreenNudge is installed, this invite normally opens the app automatically. You can
            also enter the code manually from your circle.
          </p>
        </div>
      </div>
    </section>
  );
}
