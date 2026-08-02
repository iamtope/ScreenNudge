# Supabase setup for ScreenNudge

## 1. Create project

1. [supabase.com](https://supabase.com) → New project
2. Authentication → Providers → enable **Apple** and **Google**

### Apple

ScreenNudge uses **native** Sign in with Apple on iOS. Apple’s sheet works on the phone; Supabase must accept the token.

**If you see `Provider (issuer "https://appleid.apple.com") is not enabled`**, Apple is off or incomplete in Supabase — not an Apple Developer website URL problem.

1. Supabase → **Authentication** → **Providers** → **Apple**
2. Toggle **Enable Apple provider** ON
3. **Client IDs** (comma-separated) — must include your iOS bundle ID:
   ```
   com.abassadamo.pull
   ```
   If you created a Services ID (e.g. `com.abassadamo.pull.auth`), you can add it here too, but the bundle ID is required for native sign-in.
4. **Secret Key** — a JWT signed with your Apple `.p8` key (see below). You need:
   - Team ID: `B4BT4H7239`
   - Key ID: `984J8SXRC7` (from `AuthKey_984J8SXRC7.p8`)
   - **Services ID** for the JWT `sub` claim (create in Apple Developer if you don’t have one, e.g. `com.abassadamo.pull.signin`)
5. **Save**

#### Generate the secret JWT from your `.p8`

From the `pull/` folder:

```bash
npm install
APPLE_TEAM_ID=B4BT4H7239 \
APPLE_KEY_ID=984J8SXRC7 \
APPLE_CLIENT_ID=com.abassadamo.pull.signin \
APPLE_P8_PATH=./AuthKey_984J8SXRC7.p8 \
npm run apple:secret
```

Copy the long printed string into Supabase → Apple → **Secret** (not the raw `.p8` file).

- `APPLE_CLIENT_ID` = **Services ID** (Identifiers → Services IDs), not the bundle ID
- JWT expires in ~6 months — run the script again and update Supabase before it expires
- Never commit `.p8` files (already in `.gitignore`)

Apple Developer (one-time):

- **App ID** `com.abassadamo.pull` → enable **Sign in with Apple**
- **Keys** → create a key with Sign in with Apple → download `.p8` (once)
- **Services ID** + website URLs (`qzfowssjxbgbpmpb.supabase.co` + `https://qzfowssjxbgbpmpb.supabase.co/auth/v1/callback`) — mainly for web/OAuth; native still needs step 3–4 in Supabase above

### Google

Google uses a **browser OAuth flow through Supabase**. You configure Google once for Supabase; the app never talks to Google directly.

**If you see `Unsupported provider: provider is not enabled`**, Google is not turned on in Supabase yet — follow steps 1–4 below.

1. Supabase dashboard → **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider** ON
3. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
4. Create an **OAuth 2.0 Web client** (this is what Supabase uses)
5. Under **Authorized redirect URIs**, add **exactly one** URI (copy from Supabase → Google provider — “Callback URL”):
   ```
   https://qzfowssjxbgbpmpb.supabase.co/auth/v1/callback
   ```
   Rules:
   - Must be **https** (not `http`)
   - **No** trailing slash
   - **No** `pull://` here — that belongs in Supabase only (see §2)
   - If you created an **iOS** or **Android** OAuth client by mistake, Google will reject the flow — use a **Web application** client for Supabase
6. Copy the Web **Client ID** and **Client secret** back into Supabase → Google provider → **Save**

Optional (not required for the current Supabase browser flow):

- iOS client with bundle ID `com.abassadamo.pull`
- Android client with package `com.abassadamo.pull` + SHA-1 fingerprint

You do **not** put `pull://…` in Google Cloud Console. Google redirects to Supabase; Supabase redirects back to the app.

## 2. Redirect URLs (required for Google sign-in)

Supabase must know which app URLs are allowed after login.

1. Supabase → **Authentication** → **URL Configuration**
2. Add these **Redirect URLs** (allow list):

   ```
   pull://auth/callback
   pull://**
   ```

   The app uses `pull://auth/callback` (see `authRedirectUri` in `src/services/auth.ts`).

3. **Site URL** can stay as your Supabase project URL for now.

If Google sign-in opens but returns “redirect URL not allowed”, the fix is almost always adding `pull://auth/callback` in Supabase — not changing Google Cloud.

**If Safari shows “can’t connect to localhost” after Google sign-in**, Supabase redirected to `localhost` instead of `pull://`. The app now forces `pull://auth/callback` on iOS/Android — ensure that URI is in Supabase Redirect URLs. You do **not** need Authorized JavaScript origins for the mobile app.

## 3. Run migration

In Supabase **SQL Editor**, run:

[`migrations/001_account_circle.sql`](./migrations/001_account_circle.sql)

If you signed in **before** running `001`, your account exists in `auth.users` but has no `profiles` row (the invite trigger only runs on **new** signups). Run the backfill:

[`migrations/002_backfill_existing_users.sql`](./migrations/002_backfill_existing_users.sql)

For **Share my invite** in the app (auto-creates a missing profile on tap), also run:

[`migrations/003_ensure_my_profile.sql`](./migrations/003_ensure_my_profile.sql)

Then sign out and back in, or tap **Share my invite** again — your code should appear.

Run the remaining migrations in order through the latest. In particular, **`010_delete_account.sql` is required for App Store submission** — it backs the in-app "Delete account" action (Settings → Account), which Apple mandates for any app with sign-in (Guideline 5.1.1(v)):

[`migrations/010_delete_account.sql`](./migrations/010_delete_account.sql)

### App Store Server Notifications (subscriptions)

The [`appstore-notifications`](./functions/appstore-notifications/index.ts) edge function is the authoritative writer for `public.subscriptions`. It **verifies Apple's JWS signature + certificate chain** and is fail-closed, so it needs these function secrets:

```bash
supabase secrets set \
  APPLE_BUNDLE_ID=com.abassadamo.pull \
  APPLE_APP_APPLE_ID=<numeric App Store app id> \
  APPLE_ROOT_CAS_BASE64=<base64 DER of "Apple Root CA - G3">   # from apple.com/certificateauthority
supabase functions deploy appstore-notifications --no-verify-jwt
```

Without `APPLE_ROOT_CAS_BASE64` the function returns 500 (refuses to trust unverifiable payloads). Test with App Store Connect → **Request a Test Notification** before launch.

## 4. App env

Copy `.env.example` to `.env` in the `pull/` folder:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Restart Metro after changing env vars.

## 4b. Dev test accounts (one phone, two users)

For circle / invite testing without a second device:

1. Supabase → **Authentication** → **Providers** → **Email** → enable (confirm email can stay on; seed script marks users confirmed).
2. Add to `pull/.env` (service role is **secret** — never commit a real key):

   ```
   EXPO_PUBLIC_DEV_ACCOUNTS_PASSWORD=pull-local-dev
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # API → service_role secret (NOT the anon/publishable key)
   ```

3. From `pull/`:

   ```bash
   npm run seed:dev-users
   ```

   Creates `dev-alice@pull.test` and `dev-bob@pull.test` with the password above (profiles + invite codes come from `handle_new_user` / `ensure_my_profile` on first sign-in).

4. Run a **development** build (`npx expo run:ios` or dev client). On **Sign in**, tap **Alice** or **Bob**, or switch under **Settings → Developer**.

5. Test circle: sign in as Alice → share invite code → **Settings → Developer → Bob** → join with Alice’s code.

Dev buttons only appear when `__DEV__` is true (not App Store release builds).

## 5. Deep links (invite)

ScreenNudge invite links use `screennudge://invite/CODE`; the legacy `pull://invite/CODE` scheme remains registered for older links.

Universal links (`https://join.pull.app/CODE`) can be added later with Associated Domains.

## Quick checklist

| Where | What to add |
|-------|-------------|
| Google Cloud → Web OAuth client | `https://<project-ref>.supabase.co/auth/v1/callback` |
| Supabase → Google provider | Web client ID + secret |
| Supabase → Redirect URLs | `pull://auth/callback` |
| App `.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

## Troubleshooting

### `Error 400: redirect_uri_mismatch` (Google)

Google is rejecting the redirect URI Supabase sends. Fix **Google Cloud Console**, not the app.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Edit your **Web application** OAuth 2.0 client (the one whose ID is in Supabase)
3. Under **Authorized redirect URIs**, ensure this line exists **exactly**:
   ```
   https://qzfowssjxbgbpmpb.supabase.co/auth/v1/callback
   ```
4. Remove wrong entries such as `pull://auth/callback`, `http://…`, or a different Supabase project URL
5. **Save** — changes can take a minute to apply, then try sign-in again

Confirm the project ref matches your `.env`: `EXPO_PUBLIC_SUPABASE_URL` should be `https://qzfowssjxbgbpmpb.supabase.co`.

### `provider is not enabled`

Enable **Google** under Supabase → **Authentication** → **Providers** and save Client ID + secret.

### `redirect URL not allowed` (after Google succeeds)

Add `pull://auth/callback` under Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**.

### No invite code on my profile

Usually one of:

1. **Account predates migration** — `handle_new_user` never ran. Run [`002_backfill_existing_users.sql`](./migrations/002_backfill_existing_users.sql), or [`003_ensure_my_profile.sql`](./migrations/003_ensure_my_profile.sql) (creates profile on demand from the app).
2. **Migration not applied** — run `001` first, then `002` or `003`.
3. **Stale share tap** — fixed in app: share now re-fetches your code after refresh instead of using an empty cached value.

Check in Supabase **Table Editor** → `profiles` → find your user `id` (same as `auth.users.id`). If the row is missing, run `002` or `003`.
