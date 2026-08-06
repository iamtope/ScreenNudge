import type { Metadata } from 'next';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms that apply when you use ScreenNudge.',
};

export default function TermsPage() {
  return (
    <section className="section legal-page">
      <div className="container legal-page__inner">
        <header className="legal-page__header">
          <p className="eyebrow">Legal</p>
          <h1 className="h1">Terms of Use</h1>
          <p className="legal-page__updated">Last updated: August 2, 2026</p>
        </header>

        <div className="legal-page__body">
          <section>
            <h2>Agreement</h2>
            <p>
              By downloading or using ScreenNudge, you agree to these terms and Apple&apos;s{' '}
              <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">
                Standard End User License Agreement
              </a>
              . If you do not agree, do not use the app.
            </p>
          </section>

          <section>
            <h2>Using ScreenNudge</h2>
            <p>
              You may use ScreenNudge for personal, lawful purposes. You are responsible for your
              account, the accuracy of information you provide, and activity under your account. Do
              not misuse the service, interfere with its operation, attempt unauthorized access, or
              use it to harm others.
            </p>
          </section>

          <section>
            <h2>Screen Time features</h2>
            <p>
              ScreenNudge uses Apple&apos;s Screen Time frameworks and depends on permissions and
              system behavior controlled by Apple. Protection may be unavailable, delayed, or
              bypassed in some circumstances. ScreenNudge is a habit-support tool and is not a
              medical, emergency, parental-control, or safety-critical service.
            </p>
          </section>

          <section>
            <h2>Subscriptions</h2>
            <p>
              Paid features may be offered through auto-renewing App Store subscriptions. Payment is
              charged to your Apple ID. Unless cancelled at least 24 hours before the current period
              ends, a subscription may renew automatically. You can manage or cancel subscriptions
              in your Apple ID account settings. Pricing and trial terms are shown before purchase.
            </p>
          </section>

          <section>
            <h2>Account deletion and termination</h2>
            <p>
              You may stop using ScreenNudge or delete your account at any time. We may suspend or
              terminate access when reasonably necessary to protect users, enforce these terms,
              comply with law, or maintain the service.
            </p>
          </section>

          <section>
            <h2>Availability and liability</h2>
            <p>
              ScreenNudge is provided on an “as is” and “as available” basis to the extent permitted
              by law. We do not guarantee uninterrupted or error-free operation. To the maximum
              extent permitted by law, ScreenNudge and its operators are not liable for indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              service.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update these terms as ScreenNudge changes. We will update the date on this page
              and provide additional notice when required. Continuing to use ScreenNudge after an
              update means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms can be sent to{' '}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
