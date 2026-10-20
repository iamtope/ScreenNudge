# Roadmap

This page lists what ScreenNudge does today and what is planned. The planned items are
direction, not commitments, and their order may change. If you want to pick something up,
open an issue first.

**Legend:** ✅ shipped · 🚧 in progress / partially done · 🗓️ planned · 💡 exploring

---

## Shipped

### Protection (iOS Screen Time)
- ✅ Choose guarded apps with the Family Controls picker (2 on Free, unlimited on ScreenNudge+)
- ✅ Custom shield screen and shield actions (`ShieldConfiguration`, `ShieldAction` extensions)
- ✅ Daily open limits tracked by a `DeviceActivityMonitor` extension
- ✅ Three protection styles: **Gentle**, **Balanced**, **Strong**
- ✅ Nudge flow steps: breathing, intention check, typed phrase, math challenge, word challenge,
  step counter (motion sensor), timed delay, final decision
- ✅ Stricter challenges once you're over your daily limit
- ✅ Wind-Down: guarded apps lock at bedtime *(ScreenNudge+)*

### Onboarding
- ✅ Personalization questions, app selection, limits, protection style, plan choice
- ✅ Invite friends to a Circle during onboarding

### Insights and motivation
- ✅ Native Screen Time report extension embedded in the app
- ✅ Time-saved estimates and resist counts
- ✅ Daily streaks with a goal lock (a raised goal takes effect the next day)
- ✅ Achievements with celebration overlays (resists, streaks, focus time)

### Social
- ✅ Circle: invite codes, universal invite links (`screennudge.com/invite/CODE`) with web fallback
- ✅ Leaderboard with option to hide individual friends
- ✅ Pacer / rival benchmark bots

### Focus
- ✅ Timed focus sessions with today / week / all-time stats

### Accounts and billing
- ✅ Sign in with Apple and Google (Supabase Auth)
- ✅ In-app account deletion (App Store guideline 5.1.1(v))
- ✅ ScreenNudge+ monthly and annual subscriptions via StoreKit
- ✅ App Store Server Notifications edge function with JWS signature verification
- ✅ Protection preferences, usage events and achievements synced to Supabase

### Website
- ✅ Next.js marketing site: About, FAQ, Contact, Privacy, Terms
- ✅ Locale routing for 7 languages (en, nl, fr, de, zh, it, tr)
- ✅ Apple App Site Association for universal links
- ✅ Light and dark themes

---

## Next up

### Launch
- 🗓️ Public App Store release (flip `appStore.available` in `web/src/config/site.ts`, set the real store URL)
- 🗓️ Real support address and founder story on the website
- 🚧 Translate the six stub locales. Only English is complete; the rest fall back to English.

### Quality
- 🗓️ Unit tests for `src/domain` (nudge flows, streak and goal-lock rules, achievements, time saved)
- 🗓️ Component tests for the nudge steps and onboarding
- 🗓️ End-to-end tests for sign-in, onboarding → activate, and purchase / restore
- 🗓️ CI on pull requests: typecheck, lint, tests and the website build
- 🗓️ Restore the dev test-account seed script that `pull/supabase/README.md` refers to

### Product
- 🗓️ Richer Insights for ScreenNudge+: weekly trends, peak-urge times, per-app breakdowns
- 🗓️ More nudge steps (e.g. journaling prompt, "message a friend" accountability step)
- 🗓️ Scheduled protection beyond Wind-Down (work hours, custom schedules)
- 🗓️ Circle challenges: shared weekly goals with friends
- 🗓️ Home Screen and Lock Screen widgets for streak and time saved

---

## Exploring

- 💡 Android version. Screen Time is iOS-only, so this would need a different blocking
  mechanism (UsageStats / Accessibility APIs).
- 💡 Website and Safari-extension nudges for browser doomscrolling
- 💡 Localizing the app itself, not only the website
- 💡 Family / shared plans
