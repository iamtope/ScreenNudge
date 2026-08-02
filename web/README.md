# ScreenNudge — website

Marketing site for **ScreenNudge** (About · FAQ · Contact), built with Next.js (App Router,
TypeScript). Warm brass identity matching the app. Seven languages wired up, with
English as the source and the rest falling back to it until translated.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000  → redirects to /en
npm run build   # production build (prerenders every locale)
npm run start   # serve the production build
```

Requires Node 18.18+ (developed on Node 25).

## Before you launch — edit these placeholders

Everything you need to personalise lives in **`src/config/site.ts`**:

| Field | What to set |
|-------|-------------|
| `email` | Your real support address (currently `hello@pull.app`) |
| `appStore.available` | Flip to `true` once live — this turns every "Get ScreenNudge" button into a real App Store link |
| `appStore.url` | Your App Store listing URL |
| `minIOS`, `copyrightYear`, `social` | Self-explanatory |

Until `appStore.available` is `true`, "Get ScreenNudge" buttons route to the Contact page and the
home CTA shows "Coming soon to the App Store."

One more: the founder story in `src/i18n/messages/en.ts` → `home.mission.body` is a
placeholder — replace it with your own.

## Languages

Locales: `en, nl, fr, de, zh, it, tr` (English, Dutch, French, German, Chinese, Italian, Turkish).

- **English** is complete: `src/i18n/messages/en.ts`.
- The other six are **stubs** (`nl.ts`, `fr.ts`, …). Any key you don't translate falls
  back to English automatically, so the site never shows a blank string.

### Translate a language

Open e.g. `src/i18n/messages/nl.ts` and override only the keys you want:

```ts
export const nl: DeepPartial<Dictionary> = {
  nav: { about: 'Over', faq: 'FAQ', contact: 'Contact', cta: 'Download ScreenNudge' },
  home: { hero: { title: 'Zet een adempauze tussen jou en de *scroll*.' } },
};
```

Notes:
- Text wrapped in `*asterisks*` renders as the italic brass accent.
- `{ios}` / `{year}` tokens are substituted at render time — keep them.
- Arrays (FAQ items, steps, features) are replaced whole: translate the full list or omit it.

### Add a new language

1. Add the code to `locales` and a native name to `localeNames` in `src/i18n/config.ts`.
2. Create `src/i18n/messages/<code>.ts` (copy an existing stub).
3. Register it in `src/i18n/getDictionary.ts`.

## Structure

```
app/
  [locale]/           # locale-scoped routes (root layout lives here)
    layout.tsx        # <html lang>, header + footer
    page.tsx          # About (landing)
    faq/page.tsx
    contact/page.tsx
  globals.css         # design tokens + all styles (light + dark, theme-aware)
middleware.ts         # detects language, redirects / → /en, /faq → /en/faq …
src/
  config/site.ts      # ← your placeholders
  i18n/               # locales, dictionaries, loader
  components/         # Header, Footer, LanguageSwitcher, PhoneMockup, ContactForm, …
public/
  mockups.html        # the standalone marketing phone mockups → /mockups.html
  favicon.svg
```

## Design

- Tokens (colour, radius, spacing) are CSS custom properties at the top of
  `app/globals.css`. Both light and dark themes are defined; the site follows the
  viewer's OS preference.
- The phone-mockup device screens keep the app's own committed palette on purpose.

## Deploy

Uses middleware (locale redirects), so it needs a Node/edge host — **Vercel** is the
easiest (`vercel`), Netlify with the Next runtime also works. It is **not** a static
`next export`.
