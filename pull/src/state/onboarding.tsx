import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DiscoveredApp } from '@/src/domain/appData';
import {
  DEFAULT_DAILY_LIMIT_MIN,
  DEFAULT_DAILY_OPENS,
  DEFAULT_PROTECTION_MODE,
  type ProtectionMode,
} from '@/src/domain/onboarding';
import {
  applyBedtimeSchedule,
  applyProtection,
  hasPersistedScreenTimeSelection,
  PULL_SELECTION_ID,
  startProtectionReblockListener,
  syncScreenTimeSelectionCount,
} from '@/src/services/protection';
import {
  loadProtectionSnapshot,
  saveProtectionSnapshot,
  snapshotFromOnboardingState,
  type ProtectionSnapshot,
} from '@/src/services/protectionStorage';
import {
  applyPreferencesToSnapshot,
  loadProtectionPreferences,
  snapshotFromPreferences,
  syncProtectionPreferences,
} from '@/src/services/protectionPreferences';
import { readOnboardingComplete, writeOnboardingComplete } from '@/src/lib/storage';
import { clearGoalLock, recordGoalChange } from '@/src/services/goalLock';
import { useSession } from '@/src/state/session';

export type AppProtection = {
  dailyLimitMin: number;
  dailyOpens: number;
  mode: ProtectionMode;
};

type OnboardingState = {
  answers: Record<string, string>;
  discoveredApps: DiscoveredApp[];
  selectedAppIds: string[];
  protections: Record<string, AppProtection>;
  activated: boolean;
  screenTimeAppCount: number;
  hydrationReady: boolean;
  onboardingComplete: boolean;
};

export const SCREEN_TIME_PROTECTION_ID = 'screen-time-selection';

type OnboardingContextValue = OnboardingState & {
  setAnswer: (questionId: string, optionId: string) => void;
  setDiscoveredApps: (apps: DiscoveredApp[]) => void;
  toggleApp: (appId: string) => void;
  trimSelectedApps: (max: number) => void;
  isSelected: (appId: string) => boolean;
  setDailyLimit: (appId: string, minutes: number) => void;
  setDailyOpens: (appId: string, opens: number) => void;
  setMode: (appId: string, mode: ProtectionMode) => void;
  getProtection: (appId: string) => AppProtection;
  selectedApps: DiscoveredApp[];
  setScreenTimeAppCount: (count: number) => void;
  usingScreenTime: boolean;
  protectedCount: number;
  /**
   * Whether this device actually has apps picked for protection. The Screen Time
   * selection lives in device storage and cannot be restored from the server, so
   * having an account is never proof of a working setup.
   */
  hasProtectionSetup: boolean;
  protectionTargets: { id: string; name: string; glyph: string }[];
  setActivated: (value: boolean) => void;
  markOnboardingComplete: () => void;
  activateProtectionNow: () => Promise<{ ok: boolean; message?: string }>;
  reapplyProtection: () => Promise<{ ok: boolean; message?: string }>;
  persistState: () => Promise<void>;
  reset: () => void;
  bedtimeEnabled: boolean;
  bedtimeStart: number;
  bedtimeEnd: number;
  setBedtime: (enabled: boolean, startMin: number, endMin: number) => void;
};

const defaultProtection: AppProtection = {
  dailyLimitMin: DEFAULT_DAILY_LIMIT_MIN,
  dailyOpens: DEFAULT_DAILY_OPENS,
  mode: DEFAULT_PROTECTION_MODE,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function applySnapshot(
  snapshot: ProtectionSnapshot,
  setters: {
    setSelectedAppIds: (v: string[]) => void;
    setProtections: (v: Record<string, AppProtection>) => void;
    setActivated: (v: boolean) => void;
    setScreenTimeAppCount: (v: number) => void;
  },
) {
  setters.setSelectedAppIds(snapshot.selectedAppIds);
  setters.setProtections(snapshot.protections);
  setters.setActivated(snapshot.activated);
  const nativeCount = syncScreenTimeSelectionCount();
  const count = snapshot.usingScreenTime
    ? Math.max(snapshot.screenTimeAppCount, nativeCount)
    : snapshot.selectedAppIds.length;
  setters.setScreenTimeAppCount(count);
}

function hasConfiguredProtection(snapshot: ProtectionSnapshot): boolean {
  return (
    snapshot.activated ||
    snapshot.usingScreenTime ||
    snapshot.screenTimeAppCount > 0 ||
    snapshot.selectedAppIds.length > 0
  );
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [discoveredApps, setDiscoveredAppsState] = useState<DiscoveredApp[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [protections, setProtections] = useState<Record<string, AppProtection>>({});
  const [activated, setActivated] = useState(false);
  const [screenTimeAppCount, setScreenTimeAppCountState] = useState(0);
  const [bedtimeEnabled, setBedtimeEnabled] = useState(false);
  const [bedtimeStart, setBedtimeStart] = useState(22 * 60);
  const [bedtimeEnd, setBedtimeEnd] = useState(7 * 60);
  const [hydrationReady, setHydrationReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const snapshotRef = useRef<ProtectionSnapshot | null>(null);

  const usingScreenTime =
    hasPersistedScreenTimeSelection() || screenTimeAppCount > 0;
  const protectedCount = usingScreenTime ? screenTimeAppCount : selectedAppIds.length;
  // usingScreenTime already covers a persisted native selection whose count has not
  // been read back into state yet, so this stays true across a cold launch.
  const hasProtectionSetup = usingScreenTime || selectedAppIds.length > 0;

  const protectionTargets = useMemo(() => {
    if (usingScreenTime) {
      return [
        {
          id: SCREEN_TIME_PROTECTION_ID,
          name: `${screenTimeAppCount} selected app${screenTimeAppCount === 1 ? '' : 's'}`,
          glyph: String(screenTimeAppCount || '✓'),
        },
      ];
    }
    return discoveredApps
      .filter((app) => selectedAppIds.includes(app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        glyph: app.glyph ?? app.name.charAt(0).toUpperCase(),
      }));
  }, [usingScreenTime, screenTimeAppCount, discoveredApps, selectedAppIds]);

  const buildSnapshot = useCallback((): ProtectionSnapshot => {
    return snapshotFromOnboardingState({
      usingScreenTime,
      screenTimeAppCount,
      selectedAppIds,
      protections,
      activated,
      protectionTargets,
      bedtimeEnabled,
      bedtimeStart,
      bedtimeEnd,
    });
  }, [usingScreenTime, screenTimeAppCount, selectedAppIds, protections, activated, protectionTargets, bedtimeEnabled, bedtimeStart, bedtimeEnd]);

  const persistState = useCallback(async () => {
    const snapshot = buildSnapshot();
    snapshotRef.current = snapshot;
    await saveProtectionSnapshot(snapshot);
    void syncProtectionPreferences(snapshot);
  }, [buildSnapshot]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      // The landing screen waits on hydrationReady before it will route, so this
      // has to resolve even when storage misbehaves — otherwise the app sits on a
      // spinner forever.
      try {
        const completed = await readOnboardingComplete().catch(() => false);
        if (mounted && completed) {
          setOnboardingComplete(true);
        }

        let snapshot = await loadProtectionSnapshot();
        if (!snapshot) {
          const preferences = await loadProtectionPreferences();
          if (preferences) {
            snapshot = snapshotFromPreferences(preferences);
            await saveProtectionSnapshot(snapshot);
          }
        }
        if (!mounted) {
          return;
        }
        if (snapshot) {
          snapshotRef.current = snapshot;
          applySnapshot(snapshot, {
            setSelectedAppIds,
            setProtections,
            setActivated,
            setScreenTimeAppCount,
          });
          setBedtimeEnabled(snapshot.bedtimeEnabled);
          setBedtimeStart(snapshot.bedtimeStart);
          setBedtimeEnd(snapshot.bedtimeEnd);
          if (snapshot.activated && snapshot.usingScreenTime) {
            void applyProtection(snapshot);
            void applyBedtimeSchedule(snapshot);
          }
        }
      } finally {
        if (mounted) {
          setHydrationReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrationReady || !userId) {
      return;
    }

    const snapshot = snapshotRef.current;
    if (snapshot && hasConfiguredProtection(snapshot)) {
      void syncProtectionPreferences(snapshot);
      return;
    }

    let cancelled = false;
    void (async () => {
      const preferences = await loadProtectionPreferences();
      if (!preferences || cancelled) {
        return;
      }
      const next = snapshot
        ? applyPreferencesToSnapshot(snapshot, preferences)
        : snapshotFromPreferences(preferences);
      snapshotRef.current = next;
      applySnapshot(next, {
        setSelectedAppIds,
        setProtections,
        setActivated,
        setScreenTimeAppCount,
      });
      setBedtimeEnabled(next.bedtimeEnabled);
      setBedtimeStart(next.bedtimeStart);
      setBedtimeEnd(next.bedtimeEnd);
      await saveProtectionSnapshot(next);
      // Restored limits/mode have to reach Screen Time, the same way the local
      // hydration path applies them — otherwise the synced settings never take.
      if (next.activated && next.usingScreenTime) {
        void applyProtection(next);
        void applyBedtimeSchedule(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrationReady, userId]);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }
    void persistState();
  }, [
    hydrationReady,
    persistState,
    selectedAppIds,
    protections,
    activated,
    screenTimeAppCount,
    usingScreenTime,
  ]);

  useEffect(() => {
    return startProtectionReblockListener(() => snapshotRef.current);
  }, []);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }
    void applyBedtimeSchedule(buildSnapshot());
  }, [hydrationReady, bedtimeEnabled, bedtimeStart, bedtimeEnd, buildSnapshot]);

  const setAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  const setDiscoveredApps = useCallback((apps: DiscoveredApp[]) => {
    setDiscoveredAppsState(apps);
  }, []);

  const toggleApp = useCallback((appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId],
    );
    setProtections((prev) => (prev[appId] ? prev : { ...prev, [appId]: { ...defaultProtection } }));
  }, []);

  const trimSelectedApps = useCallback((max: number) => {
    setSelectedAppIds((prev) => (prev.length > max ? prev.slice(0, max) : prev));
  }, []);

  const isSelected = useCallback(
    (appId: string) => selectedAppIds.includes(appId),
    [selectedAppIds],
  );

  const setDailyLimit = useCallback((appId: string, minutes: number) => {
    setProtections((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] ?? defaultProtection), dailyLimitMin: minutes },
    }));
    // Blocking picks the new limit up immediately; the streak keeps judging against
    // the goal frozen this morning unless this makes it harder.
    void recordGoalChange(minutes);
  }, []);

  const setDailyOpens = useCallback((appId: string, opens: number) => {
    setProtections((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] ?? defaultProtection), dailyOpens: opens },
    }));
  }, []);

  const setMode = useCallback((appId: string, mode: ProtectionMode) => {
    setProtections((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] ?? defaultProtection), mode },
    }));
  }, []);

  const getProtection = useCallback(
    (appId: string) => protections[appId] ?? defaultProtection,
    [protections],
  );

  const selectedApps = useMemo(
    () => discoveredApps.filter((app) => selectedAppIds.includes(app.id)),
    [discoveredApps, selectedAppIds],
  );

  const setScreenTimeAppCount = useCallback((count: number) => {
    setScreenTimeAppCountState(count);
    if (count > 0) {
      setProtections((prev) =>
        prev[SCREEN_TIME_PROTECTION_ID]
          ? prev
          : { ...prev, [SCREEN_TIME_PROTECTION_ID]: { ...defaultProtection } },
      );
    }
  }, []);

  /**
   * Past this point the user has a working setup, so they should land on Home on
   * the next launch rather than back on the marketing screen — with or without an
   * account, since protection is entirely local.
   */
  const markOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
    void writeOnboardingComplete(true);
  }, []);

  const activateProtectionNow = useCallback(async () => {
    const snapshot = buildSnapshot();
    snapshot.activated = true;
    snapshotRef.current = snapshot;
    await saveProtectionSnapshot(snapshot);
    setActivated(true);
    const result = await applyProtection(snapshot);
    if (result.ok) {
      markOnboardingComplete();
    }
    void applyBedtimeSchedule(snapshot);
    return result;
  }, [buildSnapshot, markOnboardingComplete]);

  const reapplyProtection = useCallback(async () => {
    return applyProtection(buildSnapshot());
  }, [buildSnapshot]);

  const setBedtime = useCallback((enabled: boolean, startMin: number, endMin: number) => {
    setBedtimeEnabled(enabled);
    setBedtimeStart(startMin);
    setBedtimeEnd(endMin);
  }, []);

  const reset = useCallback(() => {
    setAnswers({});
    setDiscoveredAppsState([]);
    setSelectedAppIds([]);
    setProtections({});
    setActivated(false);
    setScreenTimeAppCountState(0);
    setOnboardingComplete(false);
    void writeOnboardingComplete(false);
    void clearGoalLock();
    snapshotRef.current = null;
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      answers,
      discoveredApps,
      selectedAppIds,
      protections,
      activated,
      screenTimeAppCount,
      hydrationReady,
      onboardingComplete,
      setAnswer,
      setDiscoveredApps,
      toggleApp,
      trimSelectedApps,
      isSelected,
      setDailyLimit,
      setDailyOpens,
      setMode,
      getProtection,
      selectedApps,
      setScreenTimeAppCount,
      usingScreenTime,
      protectedCount,
      hasProtectionSetup,
      protectionTargets,
      setActivated,
      markOnboardingComplete,
      activateProtectionNow,
      reapplyProtection,
      persistState,
      reset,
      bedtimeEnabled,
      bedtimeStart,
      bedtimeEnd,
      setBedtime,
    }),
    [
      answers,
      discoveredApps,
      selectedAppIds,
      protections,
      activated,
      screenTimeAppCount,
      hydrationReady,
      onboardingComplete,
      markOnboardingComplete,
      bedtimeEnabled,
      bedtimeStart,
      bedtimeEnd,
      setBedtime,
      setAnswer,
      setDiscoveredApps,
      toggleApp,
      trimSelectedApps,
      isSelected,
      setDailyLimit,
      setDailyOpens,
      setMode,
      getProtection,
      selectedApps,
      setScreenTimeAppCount,
      usingScreenTime,
      protectedCount,
      hasProtectionSetup,
      protectionTargets,
      activateProtectionNow,
      reapplyProtection,
      persistState,
      reset,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
