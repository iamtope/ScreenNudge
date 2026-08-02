import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { useAccess } from '@/src/state/access';
import { useOnboarding } from '@/src/state/onboarding';

export type GuardLimit = {
  isPullPlus: boolean;
  limit: number;
  count: number;
  atLimit: boolean;
  overLimit: boolean;
  canAddMore: boolean;
  remaining: number;
};

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
