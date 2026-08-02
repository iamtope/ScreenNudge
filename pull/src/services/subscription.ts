import { supabase } from '@/src/lib/supabase';

type SubscriptionRow = {
  user_id: string;
  status: 'active' | 'expired' | 'unknown';
  product_id: string | null;
  plan: string | null;
  current_period_end: string | null;
};

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
  }
}

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
