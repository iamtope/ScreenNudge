// Supabase Edge Function: App Store Server Notifications V2.
//
// Apple POSTs subscription lifecycle events here (renew / expire / refund / etc.).
// This is the AUTHORITATIVE writer for public.subscriptions — refund-proof and
// independent of the device.
//
// Security: the payload's JWS signature AND Apple's x5c certificate chain are
// cryptographically verified against the Apple Root CAs before any entitlement is
// written. The function is FAIL-CLOSED — if verification can't run (missing root
// CAs) or fails (bad signature / wrong app), it rejects and writes nothing.
//
// Deploy:
//   supabase functions deploy appstore-notifications --no-verify-jwt
//
// Required function secrets (supabase secrets set KEY=value):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — provided by the platform
//   APPLE_BUNDLE_ID         — e.g. com.example.screennudge
//   APPLE_APP_APPLE_ID      — numeric App Store app id (App Store Connect → App → General → Apple ID)
//   APPLE_ROOT_CAS_BASE64   — comma-separated base64 DER of "Apple Root CA - G3"
//                             (download from https://www.apple.com/certificateauthority/)
//
// App Store Connect → App Information → App Store Server Notifications: point the
// Production + Sandbox URLs at https://<project-ref>.functions.supabase.co/appstore-notifications
//
// User mapping: the app sets Apple's appAccountToken to the Supabase user id at
// purchase time (see startPullPlusPurchase). The verified transaction carries it
// back here so renew/expire/refund attribute to the right user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Environment, SignedDataVerifier } from 'npm:@apple/app-store-server-library@1.6.0';
import { Buffer } from 'node:buffer';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.abassadamo.pull';
const APP_APPLE_ID = Number(Deno.env.get('APPLE_APP_APPLE_ID') ?? '') || undefined;

const APPLE_ROOT_CAS: Buffer[] = (Deno.env.get('APPLE_ROOT_CAS_BASE64') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((b64) => Buffer.from(b64, 'base64'));

const ACTIVE_TYPES = new Set([
  'SUBSCRIBED',
  'DID_RENEW',
  'DID_CHANGE_RENEWAL_STATUS',
  'OFFER_REDEEMED',
  'DID_CHANGE_RENEWAL_PREF',
]);
const INACTIVE_TYPES = new Set(['EXPIRED', 'GRACE_PERIOD_EXPIRED', 'REFUND', 'REVOKE']);

// Verifiers are environment-specific; build lazily and cache per environment.
const verifierCache = new Map<Environment, SignedDataVerifier>();
function getVerifier(env: Environment): SignedDataVerifier {
  const cached = verifierCache.get(env);
  if (cached) return cached;
  // enableOnlineChecks=true → also checks cert revocation (OCSP) online.
  const verifier = new SignedDataVerifier(APPLE_ROOT_CAS, true, env, BUNDLE_ID, APP_APPLE_ID);
  verifierCache.set(env, verifier);
  return verifier;
}

/**
 * Unverified decode of a JWS body — used ONLY to route to the correct
 * environment verifier (Apple sends both Sandbox and Production to the same URL).
 * The result is NOT trusted; getVerifier().verifyAndDecode* does the real work.
 */
function peekEnvironment(signedPayload: string): Environment {
  try {
    const [, body] = signedPayload.split('.');
    const json = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.data?.environment === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  } catch {
    return Environment.PRODUCTION;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Fail-closed: without root CAs we cannot verify, so we refuse rather than trust.
  if (APPLE_ROOT_CAS.length === 0) {
    console.error('APPLE_ROOT_CAS_BASE64 not set — refusing to process unverifiable notifications.');
    return new Response('Server not configured for signature verification', { status: 500 });
  }

  try {
    const body = await req.json();
    const signedPayload: string | undefined = body?.signedPayload;
    if (!signedPayload) {
      return new Response('Missing signedPayload', { status: 400 });
    }

    const verifier = getVerifier(peekEnvironment(signedPayload));

    // Cryptographic verification: JWS signature + Apple cert chain + bundle/app id.
    let payload;
    let txnInfo;
    try {
      payload = await verifier.verifyAndDecodeNotification(signedPayload);
      const signedTxn = payload.data?.signedTransactionInfo;
      txnInfo = signedTxn ? await verifier.verifyAndDecodeTransaction(signedTxn) : null;
    } catch (verifyErr) {
      console.error('JWS verification failed', verifyErr);
      return new Response('Invalid signature', { status: 401 });
    }

    const userId = txnInfo?.appAccountToken;
    if (!userId) {
      console.warn('No appAccountToken on verified transaction; cannot map to a user.', {
        type: payload.notificationType,
        originalTransactionId: txnInfo?.originalTransactionId,
      });
      return new Response('No user mapping', { status: 202 });
    }

    const notInFuture = !txnInfo?.expiresDate || txnInfo.expiresDate <= Date.now();
    const isActive =
      ACTIVE_TYPES.has(payload.notificationType) &&
      !INACTIVE_TYPES.has(payload.notificationType) &&
      !notInFuture;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        status: isActive ? 'active' : 'expired',
        product_id: txnInfo?.productId ?? null,
        current_period_end: txnInfo?.expiresDate
          ? new Date(txnInfo.expiresDate).toISOString()
          : null,
        environment: payload.data?.environment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.error('upsert failed', error);
      return new Response('DB error', { status: 500 });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('handler error', err);
    return new Response('Bad request', { status: 400 });
  }
});
