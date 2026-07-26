import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { type GateReason, useGate } from '@/src/state/access';

export function useUnlockNavigation(requirement: GateReason) {
  const router = useRouter();
  const { unlocked, blockedBy } = useGate(requirement);

  const onUnlock = useCallback(() => {
    const target = blockedBy ?? requirement;
    if (target === 'account') {
      router.push('/auth/sign-in');
    } else if (target === 'circle') {
      router.push('/circle/join');
    } else {
      router.push('/premium');
    }
  }, [blockedBy, requirement, router]);

  return { unlocked, blockedBy, onUnlock };
}
