import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { isScreenTimeAvailable } from '@/src/services/screenTime';
import { goalDateKey, resolveGoalLock } from '@/src/services/goalLock';

const STREAK_LEDGER_KEY = 'pull:streakLedger';
const STREAK_BREACHED_DAY_KEY = 'pull:streakBreachedDay';

export type StreakSummary = {
  /** Consecutive days up to now where the goal was kept. */
  current: number;
  /** The best run in the ledger's history. */
  best: number;
  /** The goal today is being judged against, in minutes. */
  goalMin: number;
  /** True once today's goal has already been passed. */
  breachedToday: boolean;
  /** A raised goal that starts counting tomorrow, if one is queued. */
  pendingGoalMin: number | null;
};

export const EMPTY_STREAK: StreakSummary = {
  current: 0,
  best: 0,
  goalMin: 0,
  breachedToday: false,
  pendingGoalMin: null,
};

type DeviceActivity = typeof import('react-native-device-activity');

let cached: DeviceActivity | null | undefined;

function mod(): DeviceActivity | null {
  if (cached !== undefined) {
    return cached;
  }
  if (!isScreenTimeAvailable()) {
    cached = null;
    return null;
  }
  try {
    cached = require('react-native-device-activity') as DeviceActivity;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Days the goal was exceeded, written by the monitor extension. It seals each day
 * at 23:59:59 whether or not the app was ever opened, so gaps here mean the app was
 * uninstalled or protection was off — not that the user was quietly overshooting.
 */
function readLedger(library: DeviceActivity): Record<string, boolean> {
  try {
    const raw = library.userDefaultsGet<string>(STREAK_LEDGER_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function shiftDay(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + delta);
  return goalDateKey(date);
}

/**
 * Today is counted while it is still going: a day only breaks the streak once the
 * goal has actually been passed, not merely because it has not finished yet.
 */
function countCurrent(ledger: Record<string, boolean>, breachedToday: boolean): number {
  const today = goalDateKey();
  let streak = 0;

  // Today is not sealed until midnight, so an absent entry means "still going".
  const sealedToday = ledger[today];
  const keptToday = sealedToday === false || (sealedToday === undefined && !breachedToday);
  if (keptToday) {
    streak += 1;
  }

  // Then walk back through sealed days. Stop at the first breach, and also at the
  // first day with no record at all — an unknown day cannot honestly be claimed.
  let cursor = shiftDay(today, -1);
  while (ledger[cursor] === false) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  return streak;
}

function countBest(ledger: Record<string, boolean>, current: number): number {
  const days = Object.keys(ledger).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of days) {
    if (ledger[day] !== false) {
      run = 0;
      previous = day;
      continue;
    }
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return Math.max(best, current);
}

export async function getStreak(configuredGoalMin: number): Promise<StreakSummary> {
  const { goalMin, pendingGoalMin } = await resolveGoalLock(configuredGoalMin);
  const library = mod();
  if (!library) {
    return { ...EMPTY_STREAK, goalMin, pendingGoalMin: pendingGoalMin ?? null };
  }

  const ledger = readLedger(library);
  const breachedToday =
    library.userDefaultsGet<string>(STREAK_BREACHED_DAY_KEY) === goalDateKey();
  const current = countCurrent(ledger, breachedToday);

  return {
    current,
    best: countBest(ledger, current),
    goalMin,
    breachedToday,
    pendingGoalMin: pendingGoalMin ?? null,
  };
}

export type CircleStreak = {
  userId: string;
  displayName: string;
  current: number;
  best: number;
};

type CircleStreakRow = {
  user_id: string;
  display_name: string | null;
  current_streak: number;
  best_streak: number;
};

/**
 * Push the count only. The per-day ledger stays on the device because it is derived
 * from Screen Time, which must never leave it.
 */
export async function syncStreak(summary: StreakSummary): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return;
    }
    await supabase.rpc('upsert_my_streak', {
      p_current: summary.current,
      p_best: summary.best,
      p_goal_min: Math.round(summary.goalMin) || 30,
      p_local_day: goalDateKey(),
    });
  } catch {
  }
}

const circleStreakCache = new Map<string, CircleStreak[]>();

export async function getCircleStreaks(circleId: string): Promise<CircleStreak[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  try {
    const { data, error } = await supabase.rpc('get_circle_streaks', {
      p_circle_id: circleId,
    });
    if (error || !data) {
      return circleStreakCache.get(circleId) ?? [];
    }
    const rows = (data as CircleStreakRow[]).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? 'ScreenNudge user',
      current: row.current_streak,
      best: row.best_streak,
    }));
    circleStreakCache.set(circleId, rows);
    return rows;
  } catch {
    return circleStreakCache.get(circleId) ?? [];
  }
}
