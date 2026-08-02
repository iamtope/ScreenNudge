import { useEffect } from 'react';
import { AppState } from 'react-native';

import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { useAccess } from '@/src/state/access';
import { useBilling } from '@/src/state/billing';
import { useOnboarding } from '@/src/state/onboarding';

export function EntitlementSync() {
  const { isPullPlus, isLoading } = useAccess();
  const { refreshEntitlement } = useBilling();
  const { usingScreenTime, selectedAppIds, screenTimeAppCount, trimSelectedApps, reapplyProtection } =
    useOnboarding();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshEntitlement();
    });
    return () => sub.remove();
  }, [refreshEntitlement]);

  useEffect(() => {
    if (isLoading) return;
    if (isPullPlus) return;
    if (!usingScreenTime && selectedAppIds.length > FREE_GUARDED_APP_LIMIT) {
      trimSelectedApps(FREE_GUARDED_APP_LIMIT);
    }
    if (usingScreenTime && screenTimeAppCount > FREE_GUARDED_APP_LIMIT) {
      void reapplyProtection();
    }
  }, [
    isPullPlus,
    isLoading,
    usingScreenTime,
    selectedAppIds.length,
    screenTimeAppCount,
    trimSelectedApps,
    reapplyProtection,
  ]);

  return null;
}
