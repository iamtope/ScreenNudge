import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { ProductSubscription } from 'expo-iap';

import {
  fetchPullPlusProducts,
  getPullPlusEntitlement,
  initializeBilling,
} from '@/src/services/payments';
import { getServerSubscriptionActive, recordSubscription } from '@/src/services/subscription';
import { useAccess } from '@/src/state/access';

type BillingContextValue = {
  products: ProductSubscription[];
  productsLoading: boolean;
  productsError: string | null;
  reloadProducts: () => Promise<void>;
  refreshEntitlement: () => Promise<boolean>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

const EMPTY_PRODUCTS_HINT =
  'ScreenNudge+ is temporarily unavailable from the App Store. Please try again shortly.';

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { setPullPlus } = useAccess();
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [productsLoading, setProductsLoading] = useState(Platform.OS !== 'web');
  const [productsError, setProductsError] = useState<string | null>(null);

  const reloadProducts = useCallback(async () => {
    if (Platform.OS === 'web') {
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      await initializeBilling();
      const loaded = await fetchPullPlusProducts();
      setProducts(loaded);
      setProductsError(loaded.length === 0 ? EMPTY_PRODUCTS_HINT : null);
    } catch {
      setProducts([]);
      setProductsError('Could not reach the App Store. Try again shortly.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const refreshEntitlement = useCallback(async () => {
    if (Platform.OS === 'web') {
      return false;
    }
    const entitlement = await getPullPlusEntitlement();
    if (entitlement === 'active') {
      setPullPlus(true);
      void recordSubscription(true);
      return true;
    }
    if (entitlement === 'inactive') {
      setPullPlus(false);
      void recordSubscription(false);
      return false;
    }
    return false;
  }, [setPullPlus]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    let mounted = true;

    void reloadProducts();

    (async () => {
      try {
        const entitlement = await getPullPlusEntitlement();
        if (!mounted) {
          return;
        }
        if (entitlement === 'active') {
          setPullPlus(true);
          void recordSubscription(true);
        } else if (entitlement === 'inactive') {
          setPullPlus(false);
          void recordSubscription(false);
        } else {
          const serverActive = await getServerSubscriptionActive();
          if (mounted && serverActive) {
            setPullPlus(true);
          }
        }
      } catch {
      }
    })();

    return () => {
      mounted = false;
    };
  }, [reloadProducts, setPullPlus]);

  const value = useMemo(
    () => ({
      products,
      productsLoading,
      productsError,
      reloadProducts,
      refreshEntitlement,
    }),
    [products, productsLoading, productsError, reloadProducts, refreshEntitlement],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error('useBilling must be used within BillingProvider');
  }
  return ctx;
}
