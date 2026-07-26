import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  type Achievement,
  type AchievementMetrics,
  EMPTY_METRICS,
} from '@/src/domain/achievements';
import {
  findNewlyUnlocked,
  getUnlocked,
  isSeeded,
  markUnlocked,
  setSeeded,
  type UnlockedMap,
} from '@/src/services/achievements';
import { getAttemptEvents } from '@/src/services/attempts';
import { getCircleFocusStats } from '@/src/services/focus';
import { useSession } from '@/src/state/session';
import { CelebrationOverlay } from '@/src/components/CelebrationOverlay';

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  metrics: AchievementMetrics;
  /** Recompute metrics and celebrate any newly-crossed thresholds. */
  evaluate: () => Promise<void>;
};

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive days (up to today) with at least one resist. */
function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user, circle } = useSession();
  const userId = user?.id ?? null;
  const circleId = circle?.circleId ?? null;

  const [unlocked, setUnlocked] = useState<UnlockedMap>({});
  const [metrics, setMetrics] = useState<AchievementMetrics>(EMPTY_METRICS);
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  const computeMetrics = useCallback(async (): Promise<AchievementMetrics> => {
    const events = await getAttemptEvents(365);
    const resists = events.filter((e) => e.outcome === 'comeback').length;
    const resistDates = new Set(
      events.filter((e) => e.outcome === 'comeback').map((e) => e.date),
    );
    const streak = computeStreak(resistDates);

    let focusMinutes = 0;
    let focusSessions = 0;
    if (circleId && userId) {
      try {
        const rows = await getCircleFocusStats(circleId, 'all');
        const me = rows.find((row) => row.userId === userId);
        focusMinutes = me?.focusMinutes ?? 0;
        focusSessions = me?.sessions ?? 0;
      } catch {
        // ignore — focus achievements just won't progress this pass
      }
    }
    return { resists, streak, focusMinutes, focusSessions };
  }, [circleId, userId]);

  const evaluate = useCallback(async () => {
    const next = await computeMetrics();
    setMetrics(next);
    const currentUnlocked = await getUnlocked();
    const newly = findNewlyUnlocked(next, currentUnlocked);
    const seeded = await isSeeded();
    if (newly.length) {
      const updated = await markUnlocked(newly.map((a) => a.id));
      setUnlocked(updated);
      if (seeded) {
        // Only celebrate after the first-run backlog has been seeded silently.
        setQueue((q) => [...q, ...newly]);
      }
    } else {
      setUnlocked(currentUnlocked);
    }
    if (!seeded) {
      await setSeeded();
    }
  }, [computeMetrics]);

  // Evaluate on sign-in and whenever the app returns to the foreground.
  useEffect(() => {
    if (!userId) {
      setUnlocked({});
      setMetrics(EMPTY_METRICS);
      return;
    }
    void evaluate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void evaluate();
      }
    });
    return () => sub.remove();
  }, [userId, evaluate]);

  // Surface celebrations one at a time.
  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue]);

  const value = useMemo<AchievementsContextValue>(
    () => ({ unlocked, metrics, evaluate }),
    [unlocked, metrics, evaluate],
  );

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      <CelebrationOverlay achievement={current} onDone={() => setCurrent(null)} />
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error('useAchievements must be used within an AchievementsProvider');
  }
  return ctx;
}
