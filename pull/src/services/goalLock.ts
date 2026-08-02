import AsyncStorage from '@react-native-async-storage/async-storage';

const GOAL_LOCK_KEY = 'pull:goalLock';

export type GoalLock = {
  /** The day this lock was taken, YYYY-MM-DD. */
  date: string;
  /** The goal the streak is judged against today. */
  goalMin: number;
  /** A raised goal waiting for tomorrow, if any. */
  pendingGoalMin?: number;
};

export function goalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function read(): Promise<GoalLock | null> {
  try {
    const raw = await AsyncStorage.getItem(GOAL_LOCK_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GoalLock;
    return typeof parsed?.date === 'string' && typeof parsed?.goalMin === 'number'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function write(lock: GoalLock): Promise<void> {
  try {
    await AsyncStorage.setItem(GOAL_LOCK_KEY, JSON.stringify(lock));
  } catch {
  }
}

/**
 * The goal the streak is judged against today, frozen at the start of the day.
 *
 * Rolling into a new day promotes any pending (raised) goal. Call this before
 * reading or scheduling anything streak-related so the roll-over always happens.
 */
export async function resolveGoalLock(configuredGoalMin: number): Promise<GoalLock> {
  const today = goalDateKey();
  const stored = await read();

  if (!stored) {
    const fresh: GoalLock = { date: today, goalMin: configuredGoalMin };
    await write(fresh);
    return fresh;
  }

  if (stored.date === today) {
    return stored;
  }

  // New day: whatever was queued yesterday takes effect now. Without a pending
  // value we fall back to the configured goal, which covers a limit changed while
  // the app was closed.
  const next: GoalLock = {
    date: today,
    goalMin: stored.pendingGoalMin ?? configuredGoalMin,
  };
  await write(next);
  return next;
}

/**
 * Record a goal change.
 *
 * Lowering it counts today — making the target harder should never be delayed.
 * Raising it only counts from tomorrow, so a streak cannot be rescued at 11pm by
 * moving the goalposts. Blocking is unaffected either way; it always follows the
 * configured limit. Only the streak judgement is locked.
 */
export async function recordGoalChange(nextGoalMin: number): Promise<GoalLock> {
  const lock = await resolveGoalLock(nextGoalMin);

  if (nextGoalMin < lock.goalMin) {
    const tightened: GoalLock = { date: lock.date, goalMin: nextGoalMin };
    await write(tightened);
    return tightened;
  }

  if (nextGoalMin > lock.goalMin) {
    const deferred: GoalLock = { ...lock, pendingGoalMin: nextGoalMin };
    await write(deferred);
    return deferred;
  }

  if (lock.pendingGoalMin !== undefined) {
    const cleared: GoalLock = { date: lock.date, goalMin: lock.goalMin };
    await write(cleared);
    return cleared;
  }

  return lock;
}

export async function clearGoalLock(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GOAL_LOCK_KEY);
  } catch {
  }
}
