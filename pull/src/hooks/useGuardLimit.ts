import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { useAccess } from '@/src/state/access';
import { useOnboarding } from '@/src/state/onboarding';

export type GuardLimit = {
  isPullPlus: boolean;
  /** Max guarded apps for the current plan (Infinity for Pull+). */
  limit: number;
  count: number;
  /** Free user is at the cap — adding more requires Pull+. */
  atLimit: boolean;
  /** Free user is above the cap — only reachable after a downgrade (grandfathered). */
  overLimit: boolean;
  canAddMore: boolean;
  /** Slots left before the cap (Infinity for Pull+). */
  remaining: number;
};

/** Single source of truth for the Free (2 apps) vs Pull+ (unlimited) guard limit. */
export function useGuardLimit(): GuardLimit {
  const { isPullPlus } = useAccess();
  const { protectedCount } = useOnboarding();

  return {
    isPullPlus,
    limit: isPullPlus ? Infinity : FREE_GUARDED_APP_LIMIT,
    count: protectedCount,
    atLimit: !isPullPlus && protectedCount >= FREE_GUARDED_APP_LIMIT,
    overLimit: !isPullPlus && protectedCount > FREE_GUARDED_APP_LIMIT,
    canAddMore: isPullPlus || protectedCount < FREE_GUARDED_APP_LIMIT,
    remaining: isPullPlus ? Infinity : Math.max(0, FREE_GUARDED_APP_LIMIT - protectedCount),
  };
}
