import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppProtection } from '@/src/state/onboarding';
import type { ProtectionMode } from '@/src/domain/onboarding';

const PROTECTION_KEY = 'pull:protection:v1';

export type ProtectionSnapshot = {
  version: 1;
  usingScreenTime: boolean;
  screenTimeAppCount: number;
  selectedAppIds: string[];
  protections: Record<string, AppProtection>;
  activated: boolean;
  globalMode: ProtectionMode;
  bedtimeEnabled: boolean;
  bedtimeStart: number;
  bedtimeEnd: number;
};

const defaultSnapshot = (): ProtectionSnapshot => ({
  version: 1,
  usingScreenTime: false,
  screenTimeAppCount: 0,
  selectedAppIds: [],
  protections: {},
  activated: false,
  globalMode: 'balanced',
  bedtimeEnabled: false,
  bedtimeStart: 22 * 60,
  bedtimeEnd: 7 * 60,
});

export async function loadProtectionSnapshot(): Promise<ProtectionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(PROTECTION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ProtectionSnapshot;
    if (parsed.version !== 1) {
      return null;
    }
    return { ...defaultSnapshot(), ...parsed };
  } catch {
    return null;
  }
}

export async function saveProtectionSnapshot(snapshot: ProtectionSnapshot): Promise<void> {
  await AsyncStorage.setItem(PROTECTION_KEY, JSON.stringify(snapshot));
}

export async function clearProtectionSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(PROTECTION_KEY);
}

export function snapshotFromOnboardingState(state: {
  usingScreenTime: boolean;
  screenTimeAppCount: number;
  selectedAppIds: string[];
  protections: Record<string, AppProtection>;
  activated: boolean;
  protectionTargets: { id: string }[];
  bedtimeEnabled?: boolean;
  bedtimeStart?: number;
  bedtimeEnd?: number;
}): ProtectionSnapshot {
  const firstTarget = state.protectionTargets[0]?.id;
  const globalMode = firstTarget
    ? (state.protections[firstTarget]?.mode ?? 'balanced')
    : 'balanced';

  return {
    version: 1,
    usingScreenTime: state.usingScreenTime,
    screenTimeAppCount: state.screenTimeAppCount,
    selectedAppIds: state.selectedAppIds,
    protections: state.protections,
    activated: state.activated,
    globalMode,
    bedtimeEnabled: state.bedtimeEnabled ?? false,
    bedtimeStart: state.bedtimeStart ?? 22 * 60,
    bedtimeEnd: state.bedtimeEnd ?? 7 * 60,
  };
}

export { defaultSnapshot };
