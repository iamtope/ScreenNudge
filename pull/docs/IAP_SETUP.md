# ScreenNudge+ In-App Purchases (App Store)

Configured in App Store Connect under subscription group **`ScreenNudge_plus`**.

| Plan | Reference name (Connect) | **Product ID (used in code)** | Duration |
|------|--------------------------|-------------------------------|----------|
| Monthly | `screenNudge_plus_monthly` | **`spm`** | 1 month |
| Annual | `screenNudge_plus_yearly` | **`spy`** | 1 year |

App bundle: **`com.example.screennudge`**

The **Product ID** column is what StoreKit and this app use. Reference names are labels only.

---

## Fix “SKU not found”

### 1. Confirm product IDs in Connect

**Apps** → **ScreenNudge** → **Subscriptions** → **ScreenNudge_plus**

You should see:

- `spm` — 1 month  
- `spy` — 1 year  

### 2. Clear “Missing Metadata” (required)

Both subscriptions must not stay on **Missing Metadata**. For each (`spm` and `spy`):

1. Open the subscription  
2. Set **subscription price** ($0.99 / $8.99)  
3. Add **App Store localization** (display name + description)  
4. Save until status improves (e.g. Ready to Submit)

Until metadata is complete, sandbox often returns **SKU not found**.

### 3. Agreements

**Agreements, Tax, and Banking** → **Paid Applications** → **Active**

### 4. Test on device

```bash
cd pull && npx expo run:ios --device
```

Sandbox Apple ID when prompted. Premium should show real prices when `spm` / `spy` load.

---

## Sandbox checklist

- [ ] Group `ScreenNudge_plus` with `spm` + `spy`  
- [ ] No Missing Metadata on either product  
- [ ] Paid Apps agreement active  
- [ ] Physical iPhone + dev build  
- [ ] Sandbox tester configured  

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SKU not found | Complete metadata; wait up to a few hours after changes |
| Only fallback prices | StoreKit returned 0 products — metadata not ready |
| Wrong IDs in code | Code uses `spm` and `spy` only |

---

## Entitlement model (how ScreenNudge+ unlocks)

**Primary (works today):** the device checks StoreKit (`getActiveSubscriptions`) and
sets the `isPullPlus` gate. On launch we now distinguish three states so a
**lapsed/cancelled sub is revoked**, while a transient StoreKit error / offline
launch leaves entitlement untouched (see `getPullPlusEntitlement` in
`src/services/payments.ts`).

**Server mirror (optional, migration `008_subscriptions.sql`):** the app also
mirrors its result to `public.subscriptions` via `record_subscription`, and reads
it back (`get_my_subscription`) as a fallback so a fresh device unlocks before
StoreKit syncs. Client-attested rows are *not* a security boundary.

**Authoritative validation (production hardening — not yet deployed):**
1. Apply `008_subscriptions.sql`.
2. Deploy the edge function:
   `supabase functions deploy appstore-notifications --no-verify-jwt`
3. App Store Connect → App Store Server Notifications → set the Production +
   Sandbox URL to `https://<project-ref>.functions.supabase.co/appstore-notifications`.
4. **Finish the two TODOs** in `supabase/functions/appstore-notifications/index.ts`:
   verify the JWS signature (Apple x5c chain), and ensure purchases carry an
   `appAccountToken` = Supabase user id (or persist `originalTransactionId → user_id`
   at purchase) so notifications map to a user.

Until step 4 is done the edge function only *decodes* (does not *verify*) Apple's
payload — fine for wiring/testing, not for trusting in production.
