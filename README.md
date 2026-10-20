# ScreenNudge

ScreenNudge is an iOS app that puts a short, deliberate pause between you and the apps you doomscroll.
It uses Apple's Screen Time APIs (Family Controls, Managed Settings, Device Activity) to shield
the apps you choose. When you open one, ScreenNudge asks you to breathe, state an intention, or
solve a small challenge before you decide whether to go in.

This monorepo contains the mobile app (codename **pull**) and its marketing website.

| Folder | What it is | Stack |
|--------|-----------|-------|
| [`pull/`](pull/) | The iOS app, its Screen Time extensions and Supabase backend | Expo SDK 56 / React Native, Swift, Supabase |
| [`web/`](web/) | Marketing website (About · FAQ · Contact · Privacy · Terms), 7 languages | Next.js (App Router, TypeScript) |

See [ROADMAP.md](ROADMAP.md) for what's built and what's planned.

## Features

- **Guarded apps:** pick apps with the system picker. ScreenNudge shields them and tracks
  how often you open them against a daily limit.
- **Three protection styles:** *Gentle* (breathe + intention), *Balanced* and *Strong*
  (math, word and step-count challenges, delays, no instant open once you are over your limit).
- **Insights:** a Screen Time report extension, time-saved estimates, resist streaks and achievements.
- **Circle:** invite friends by link or code and compare progress on a leaderboard. Optional
  pacer bots act as benchmarks.
- **Focus sessions:** timed deep-work sessions with stats.
- **Wind-Down** *(ScreenNudge+)*: guarded apps lock themselves at bedtime.
- **Accounts:** Sign in with Apple and Google via Supabase, with in-app account deletion.
- **Subscriptions:** StoreKit 2 via `expo-iap`. A Supabase edge function verifies
  App Store Server Notifications.

## Repository layout

```
pull/
  app/                 # expo-router screens (tabs, onboarding, settings, intercept/resist flows)
  src/                 # domain logic, services, state, shared components
  modules/             # local Expo native modules (app icons, Screen Time report view)
  targets/             # iOS app extensions: Shield, ShieldAction, DeviceActivityMonitor, ScreenTimeReport
  ios/                 # checked-in native project (used by Xcode Cloud)
  supabase/            # SQL migrations + appstore-notifications edge function
  docs/                # in-app purchase setup
web/
  app/[locale]/        # localized pages
  src/                 # site config, i18n dictionaries, components
```

## Getting started

### Prerequisites

- Node 18.18+ and npm
- For the app: macOS with Xcode, an **iOS 16.4+ physical device** (Screen Time APIs do not work
  in the simulator) and an Apple Developer account with the **Family Controls** capability
- A [Supabase](https://supabase.com) project

### Website

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Placeholders such as the support email and App Store URL live in
[`web/src/config/site.ts`](web/src/config/site.ts). See [`web/README.md`](web/README.md).

### App

```bash
cd pull
cp .env.example .env    # fill in your Supabase URL + anon key
npm install
npm run ios             # builds a dev client to a connected device
```

Backend setup (auth providers, migrations, edge function secrets) is in
[`pull/supabase/README.md`](pull/supabase/README.md). Subscription setup is in
[`pull/docs/IAP_SETUP.md`](pull/docs/IAP_SETUP.md).

#### Building under your own Apple account

The checked-in config is tied to the maintainer's Apple team and bundle ID. To build under your
own account, replace them everywhere they appear:

- the Apple Team ID: `appleTeamId` in `pull/app.json`, `DEVELOPMENT_TEAM` in the Xcode project, `web/public/.well-known/apple-app-site-association`
- the bundle ID and app group (`com.…pull`, `group.com.…pull`): `pull/app.json`, the Xcode project and `pull/targets/*/generated.entitlements`

You can find every occurrence with `git grep -n "appleTeamId\|DEVELOPMENT_TEAM\|group\.com\."`.

### Useful scripts (`pull/`)

| Command | What it does |
|---------|--------------|
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Expo config) |
| `npm run apple:secret` | Generates the Sign in with Apple client-secret JWT for Supabase |

## Deploying

- **Website:** deploy `web/` to Vercel and set the project's **Root Directory** to `web`. The
  site uses middleware for locale routing, so it cannot be a static export.
- **App:** built through Xcode Cloud ([`pull/ios/ci_scripts`](pull/ios/ci_scripts)) or EAS
  ([`pull/eas.json`](pull/eas.json)).

## Secrets

No credentials are committed. `pull/.env`, `.env*.local`, Apple `.p8`/`.p12` keys and Google
OAuth client files are gitignored. Keep the Supabase **service role** key and the Apple signing
keys in your local environment or your CI/host secret store only. The Supabase **anon** key
is safe to ship in the app because row-level security protects the data.

## Contributing

Issues and pull requests are welcome. Keep each PR focused on one change, and run
`npm run typecheck && npm run lint` in `pull/` (or `npm run build` in `web/`) before opening it.

## License

[MIT](LICENSE). The app was scaffolded from an Expo template that keeps its own MIT notice in
[`pull/LICENSE`](pull/LICENSE).
