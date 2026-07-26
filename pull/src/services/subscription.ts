import { supabase } from '@/src/lib/supabase';

/**
 * Server-side entitlement mirror. Supplements the on-device StoreKit check:
 * lets a fresh device / web read Pull+ status before StoreKit syncs, and gives a
 * place for the App Store Server Notifications edge function to write the
 * authoritative state (renew / expire / refund).
 */

type SubscriptionRow = {
  user_id: string;
  status: 'active' | 'expired' | 'unknown';
  product_id: string | null;
  plan: string | null;
  current_period_end: string | null;
};

/** Mirror the device's StoreKit result to the server (best-effort). */
export async function recordSubscription(
  active: boolean,
  productId?: string,
  plan?: string,
): Promise<void> {
  try {
    await supabase.rpc('record_subscription', {
      p_active: active,
      p_product_id: productId ?? null,
      p_plan: plan ?? null,
    });
  } catch {
    // Best-effort; StoreKit remains the primary signal on-device.
  }
}

/** Whether the server has the caller marked as an active Pull+ subscriber. */
export async function getServerSubscriptionActive(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_my_subscription');
    if (error || !data) {
      return false;
    }
    const row = (Array.isArray(data) ? data[0] : data) as SubscriptionRow | null;
    return row?.status === 'active';
  } catch {
    return false;
  }
}
