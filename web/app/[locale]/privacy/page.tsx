import type { Metadata } from 'next';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How ScreenNudge collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <section className="section legal-page">
      <div className="container legal-page__inner">
        <header className="legal-page__header">
          <p className="eyebrow">Legal</p>
          <h1 className="h1">Privacy Policy</h1>
          <p className="legal-page__updated">Last updated: August 2, 2026</p>
        </header>

        <div className="legal-page__body">
          <section>
            <h2>What ScreenNudge collects</h2>
            <p>
              When you create an account, we may collect your sign-in provider information, email
              address, display name, invite code, and circle membership. We also store the activity
              needed to provide ScreenNudge, such as challenge outcomes, timestamps, focus sessions,
              streaks, achievements, preferences, and subscription status.
            </p>
          </section>

          <section>
            <h2>Screen Time data</h2>
            <p>
              Your Apple Screen Time selections and authorization tokens stay on your device and are
              handled by Apple&apos;s frameworks. ScreenNudge does not receive the content of your
              messages, websites, or activity inside other apps.
            </p>
          </section>

          <section>
            <h2>What your circle can see</h2>
            <p>
              Circle members may see your display name, scores, streaks, summarized challenge
              activity, and live focus status. ScreenNudge is not designed to reveal the apps or
              websites you selected for protection or the content you view.
            </p>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>
              We use this information to operate and secure the service, sync your progress, provide
              circle features, manage subscriptions, respond to support requests, and improve
              ScreenNudge. We do not sell your personal information or use it for third-party
              advertising.
            </p>
          </section>

          <section>
            <h2>Service providers</h2>
            <p>
              We use service providers to run ScreenNudge, including Supabase for authentication and
              cloud data, Apple and Google for optional sign-in, and Apple for App Store purchases.
              These providers process information under their own terms and privacy policies.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can update certain profile information, leave a circle, change app permissions,
              or delete your account from the app. Deleting your account removes the account data
              associated with it, subject to limited retention required for security, fraud
              prevention, or legal compliance.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              ScreenNudge is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about privacy can be sent to{' '}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
