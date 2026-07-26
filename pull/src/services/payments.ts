import {
  finishTransaction,
  getActiveSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  fetchProducts,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

export type PullPlan = 'monthly' | 'annual';

export type PullPlusPurchaseResult = {
  productId: string;
  plan: PullPlan;
};

/** App Store Connect → Subscriptions → group `ScreenNudge_plus` */
export const PULL_PLUS_SUBSCRIPTION_GROUP = 'ScreenNudge_plus';

/** Product IDs from App Store Connect (not reference names). */
export const PULL_PLUS_SKU_MONTHLY = 'spm';
export const PULL_PLUS_SKU_ANNUAL = 'spy';
export const PULL_PLUS_PRODUCT_IDS = [PULL_PLUS_SKU_MONTHLY, PULL_PLUS_SKU_ANNUAL] as const;

const productsByPlan: Record<PullPlan, string> = {
  monthly: PULL_PLUS_SKU_MONTHLY,
  annual: PULL_PLUS_SKU_ANNUAL,
};

let billingReady = false;
let listenersAttached = false;

type PendingPurchase = {
  resolve: (result: PullPlusPurchaseResult) => void;
  reject: (error: Error) => void;
  productId: string;
  plan: PullPlan;
};

let pendingPurchase: PendingPurchase | null = null;

function isPullPlusProductId(productId: string | undefined | null): boolean {
  if (!productId) {
    return false;
  }
  return PULL_PLUS_PRODUCT_IDS.includes(productId as (typeof PULL_PLUS_PRODUCT_IDS)[number]);
}

function attachBillingListeners(): void {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  purchaseUpdatedListener(async (purchase: Purchase) => {
    const productId = purchase.productId ?? purchase.id;
    try {
      await finishTransaction({ purchase, isConsumable: false });

      if (
        pendingPurchase &&
        (productId === pendingPurchase.productId || isPullPlusProductId(productId))
      ) {
        pendingPurchase.resolve({
          productId: pendingPurchase.productId,
          plan: pendingPurchase.plan,
        });
        pendingPurchase = null;
      }
    } catch (error) {
      if (pendingPurchase) {
        pendingPurchase.reject(error instanceof Error ? error : new Error('Purchase failed'));
        pendingPurchase = null;
      }
    }
  });

  purchaseErrorListener((error) => {
    if (pendingPurchase) {
      pendingPurchase.reject(new Error(error.message ?? 'Purchase failed'));
      pendingPurchase = null;
    }
  });
}

export async function initializeBilling(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  attachBillingListeners();
  if (!billingReady) {
    await initConnection();
    billingReady = true;
  }
}

export function productSku(product: ProductSubscription): string {
  return product.id;
}

export async function fetchPullPlusProducts(): Promise<ProductSubscription[]> {
  await initializeBilling();
  const result = await fetchProducts({
    skus: [...PULL_PLUS_PRODUCT_IDS],
    type: 'subs',
  });
  return (result ?? []) as ProductSubscription[];
}

export async function ensurePullPlusProduct(productId: string): Promise<ProductSubscription> {
  const products = await fetchPullPlusProducts();
  const found = products.find((product) => productSku(product) === productId);
  if (!found) {
    const loaded = products.map(productSku).join(', ') || 'none';
    throw new Error(
      `SKU not found: "${productId}". StoreKit returned: [${loaded}]. In App Store Connect (group ScreenNudge_plus), product IDs must be spm (monthly) and spy (yearly). Complete metadata until status is not Missing Metadata. See docs/IAP_SETUP.md.`,
    );
  }
  return found;
}

/**
 * Tri-state entitlement so callers can revoke a genuinely-lapsed subscription
 * WITHOUT revoking on a transient StoreKit error / offline launch:
 * - 'active'   → StoreKit confirms an active Pull+ subscription
 * - 'inactive' → StoreKit confirms there is none (lapsed / cancelled / refunded)
 * - 'unknown'  → couldn't check (error, offline, web) — don't change entitlement
 */
export type PullPlusEntitlement = 'active' | 'inactive' | 'unknown';

export async function getPullPlusEntitlement(): Promise<PullPlusEntitlement> {
  if (Platform.OS === 'web') {
    return 'unknown';
  }
  try {
    await initializeBilling();
    const active = await getActiveSubscriptions([...PULL_PLUS_PRODUCT_IDS]);
    return active.length > 0 ? 'active' : 'inactive';
  } catch {
    return 'unknown';
  }
}

export async function checkActivePullPlusSubscription(): Promise<boolean> {
  return (await getPullPlusEntitlement()) === 'active';
}

export async function startPullPlusPurchase(
  plan: PullPlan,
  appAccountToken?: string,
): Promise<PullPlusPurchaseResult> {
  if (Platform.OS === 'web') {
    throw new Error('In-app purchases are not available on web.');
  }

  const productId = productsByPlan[plan];
  await ensurePullPlusProduct(productId);

  return new Promise<PullPlusPurchaseResult>((resolve, reject) => {
    pendingPurchase = { resolve, reject, productId, plan };

    requestPurchase({
      type: 'subs',
      request: {
        // appAccountToken ties the StoreKit transaction to the Supabase user id so
        // the server-side notification webhook can attribute renew/expire/refund.
        apple: { sku: productId, ...(appAccountToken ? { appAccountToken } : {}) },
        google: { skus: [productId] },
      },
    }).catch((error) => {
      pendingPurchase = null;
      reject(error instanceof Error ? error : new Error('Could not start purchase'));
    });
  });
}

export async function restorePullPlusPurchases(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  await initializeBilling();
  await restorePurchases();
  return checkActivePullPlusSubscription();
}

export function formatSubscriptionPrice(product: ProductSubscription | undefined, fallback: string): string {
  if (!product) {
    return fallback;
  }
  return product.displayPrice ?? fallback;
}
