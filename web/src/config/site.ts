/**
 * Central site configuration.
 *
 * ▸ TODO before launch: replace the placeholder values below with your real
 *   details. Everything the site needs from the "outside world" lives here so
 *   you only edit one file.
 */
export const site = {
  name: 'ScreenNudge',

  /** Contact address shown on the Contact page and in the footer. */
  email: 'hello@pull.app', // TODO: replace with your real support address

  /** Minimum iOS version (matches the app's deployment target). */
  minIOS: '16.4',

  /** App Store listing. Flip `available` to true and add the URL once live. */
  appStore: {
    available: false,
    url: 'https://apps.apple.com/app/id0000000000', // TODO: real App Store URL
  },

  /** Optional social links — leave a value empty ('') to hide that link. */
  social: {
    x: '',
    instagram: '',
    github: '',
  },

  copyrightYear: 2026,
} as const;

/** Where the "Get ScreenNudge" buttons point. Until the app is live, they route to Contact. */
export function getAppHref(locale: string): string {
  return site.appStore.available ? site.appStore.url : `/${locale}/contact`;
}
