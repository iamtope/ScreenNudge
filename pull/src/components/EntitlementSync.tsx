import { useEffect } from 'react';
import { AppState } from 'react-native';

import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { useAccess } from '@/src/state/access';
import { useBilling } from '@/src/state/billing';
import { useOnboarding } from '@/src/state/onboarding';

/**
 * Keeps entitlement and the guarded-app count consistent across plan changes:
 *  - refreshes entitlement on foreground so lapses / refunds surface promptly
 *    (only demotes on a confirmed inactive — see billing.refreshEntitlement)
 *  - on a confirmed downgrade, auto-trims the demo-path selection back to the
 *    free limit. The Screen Time selection is an opaque token we can't trim, so
 *    it's grandfathered (protection is never broken) and surfaced as an
 *    "over your Free limit" state instead.
 * Headless — renders nothing.
 */
export function EntitlementSync() {
  const { isPullPlus } = useAccess();
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
    if (isPullPlus) return;
    if (!usingScreenTime && selectedAppIds.length > FREE_GUARDED_APP_LIMIT) {
      // Demo path: we know the ids, so trim to the cap.
      trimSelectedApps(FREE_GUARDED_APP_LIMIT);
    }
    if (usingScreenTime && screenTimeAppCount > FREE_GUARDED_APP_LIMIT) {
      // Screen Time path: can't trim an opaque token — re-evaluate so applyProtection
      // pauses blocking (never enforces >2 for a free user).
      void reapplyProtection();
    }
  }, [
    isPullPlus,
    usingScreenTime,
    selectedAppIds.length,
    screenTimeAppCount,
    trimSelectedApps,
    reapplyProtection,
  ]);

  return null;
}
