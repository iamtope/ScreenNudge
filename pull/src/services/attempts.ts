import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProtectionMode } from '@/src/domain/onboarding';
import { getMyUsageEvents, logUsage } from '@/src/services/usage';

const ATTEMPTS_KEY = 'pull:attempts:v2';
const ATTEMPT_EVENTS_KEY = 'pull:attemptEvents:v1';
const MAX_EVENTS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Wipe local attempt/resist history (used on sign-out so stats don't bleed between users). */
export async function clearAttempts(): Promise<void> {
  await AsyncStorage.multiRemove([ATTEMPTS_KEY, ATTEMPT_EVENTS_KEY]);
}

type AttemptDay = {
  date: string;
  /** Times the user reached the intercept pause. */
  attempts: number;
  /** Times the user completed the flow and opened anyway (a granted pass). */
  opens: number;
  /** Times the user resisted and kept the app blocked. */
  resists: number;
};

// The persisted/server outcome is still "comeback" for compatibility with
// existing AsyncStorage data and Supabase RPCs. App-facing language calls it a
// resist.
export type AttemptOutcome = 'attempt' | 'open' | 'comeback';

export type AttemptEvent = {
  id: string;
  occurredAt: string;
  date: string;
  hour: number;
  outcome: AttemptOutcome;
  appName: string;
  mode: ProtectionMode;
  opensOver: boolean;
};

type AttemptEventMeta = {
  appName?: string;
  mode?: ProtectionMode;
  opensOver?: boolean;
};

const RESIST_DEDUPE_MS = 60_000;

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey(): string {
  return dateKey();
}

function emptyDay(): AttemptDay {
  return { date: todayKey(), attempts: 0, opens: 0, resists: 0 };
}

async function readDay(): Promise<AttemptDay> {
  const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
  if (!raw) {
    return emptyDay();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AttemptDay> & { comebacks?: number };
    if (parsed.date !== todayKey()) {
      return emptyDay();
    }
    return {
      date: parsed.date,
      attempts: parsed.attempts ?? 0,
      opens: parsed.opens ?? 0,
      resists: parsed.resists ?? parsed.comebacks ?? 0,
    };
  } catch {
    return emptyDay();
  }
}

async function writeDay(day: AttemptDay): Promise<void> {
  await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(day));
}

function normalizeEvent(raw: Partial<AttemptEvent>): AttemptEvent | null {
  if (!raw.occurredAt || !raw.outcome) {
    return null;
  }
  const occurred = new Date(raw.occurredAt);
  if (Number.isNaN(occurred.getTime())) {
    return null;
  }
  const outcome: AttemptOutcome =
    raw.outcome === 'open' || raw.outcome === 'comeback' ? raw.outcome : 'attempt';
  const mode: ProtectionMode =
    raw.mode === 'gentle' || raw.mode === 'strong' ? raw.mode : 'balanced';
  return {
    id: raw.id ?? `${occurred.getTime()}-${outcome}`,
    occurredAt: occurred.toISOString(),
    date: raw.date ?? dateKey(occurred),
    hour: typeof raw.hour === 'number' ? raw.hour : occurred.getHours(),
    outcome,
    appName: raw.appName?.trim() || 'Guarded apps',
    mode,
    opensOver: Boolean(raw.opensOver),
  };
}

async function readEvents(): Promise<AttemptEvent[]> {
  const raw = await AsyncStorage.getItem(ATTEMPT_EVENTS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((event) => normalizeEvent(event as Partial<AttemptEvent>))
      .filter((event): event is AttemptEvent => Boolean(event))
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  } catch {
    return [];
  }
}

async function writeEvents(events: AttemptEvent[]): Promise<void> {
  const pruned = events.slice(-MAX_EVENTS);
  await AsyncStorage.setItem(ATTEMPT_EVENTS_KEY, JSON.stringify(pruned));
}

async function appendEvent(outcome: AttemptOutcome, meta: AttemptEventMeta = {}): Promise<void> {
  const now = new Date();
  const event: AttemptEvent = {
    id: `${now.getTime()}-${outcome}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: now.toISOString(),
    date: dateKey(now),
    hour: now.getHours(),
    outcome,
    appName: meta.appName?.trim() || 'Guarded apps',
    mode: meta.mode ?? 'balanced',
    opensOver: Boolean(meta.opensOver),
  };
  const events = await readEvents();
  await writeEvents([...events, event]);
  // Mirror to the server for durable cross-device / circle stats (best-effort).
  void logUsage(outcome, {
    appName: event.appName,
    mode: event.mode,
    opensOver: event.opensOver,
    occurredAt: event.occurredAt,
    clientEventId: event.id,
  });
}

export async function getAttemptEvents(days = 7): Promise<AttemptEvent[]> {
  const [events, serverEvents] = await Promise.all([readEvents(), getMyUsageEvents(days)]);
  const since = Date.now() - Math.max(days, 1) * DAY_MS;
  const byId = new Map<string, AttemptEvent>();
  for (const event of [...serverEvents, ...events]) {
    if (new Date(event.occurredAt).getTime() >= since) {
      byId.set(event.id, event);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

/** Backfill local guest events into the signed-in account. Server-side ids dedupe repeats. */
export async function syncLocalAttemptEvents(): Promise<void> {
  const events = await readEvents();
  for (const event of events) {
    await logUsage(event.outcome, {
      appName: event.appName,
      mode: event.mode,
      opensOver: event.opensOver,
      occurredAt: event.occurredAt,
      clientEventId: event.id,
    });
  }
}

export async function getTodayAttemptCount(): Promise<number> {
  return (await getTodayStats()).attempts;
}

export async function getTodayOpens(): Promise<number> {
  return (await getTodayStats()).opens;
}

export async function getLocalTodayStats(): Promise<{ attempts: number; opens: number; resists: number }> {
  const day = await readDay();
  return { attempts: day.attempts, opens: day.opens, resists: day.resists };
}

export async function getLocalTodayOpens(): Promise<number> {
  return (await readDay()).opens;
}

export async function getTodayStats(): Promise<{ attempts: number; opens: number; resists: number }> {
  const today = todayKey();
  const events = (await getAttemptEvents(1)).filter((event) => event.date === today);
  return {
    attempts: events.filter((event) => event.outcome === 'attempt').length,
    opens: events.filter((event) => event.outcome === 'open').length,
    resists: events.filter((event) => event.outcome === 'comeback').length,
  };
}

export async function recordOpenAttempt(meta?: AttemptEventMeta): Promise<number> {
  const day = await readDay();
  const next = { ...day, date: todayKey(), attempts: day.attempts + 1 };
  await writeDay(next);
  await appendEvent('attempt', meta);
  return next.attempts;
}

export async function recordOpenGranted(meta?: AttemptEventMeta): Promise<number> {
  const day = await readDay();
  const next = { ...day, date: todayKey(), opens: day.opens + 1 };
  await writeDay(next);
  await appendEvent('open', meta);
  return next.opens;
}

export async function recordResist(meta?: AttemptEventMeta): Promise<number> {
  const appName = meta?.appName?.trim() || 'Guarded apps';
  const mode = meta?.mode ?? 'balanced';
  const opensOver = Boolean(meta?.opensOver);
  const events = await readEvents();
  const duplicate = [...events].reverse().find((event) => {
    if (event.outcome !== 'comeback') {
      return false;
    }
    if (event.appName !== appName || event.mode !== mode || event.opensOver !== opensOver) {
      return false;
    }
    return Date.now() - new Date(event.occurredAt).getTime() < RESIST_DEDUPE_MS;
  });
  const day = await readDay();
  if (duplicate) {
    return day.resists;
  }
  const next = { ...day, date: todayKey(), resists: day.resists + 1 };
  await writeDay(next);
  await appendEvent('comeback', meta);
  return next.resists;
}

export function formatAttemptLabel(count: number): string {
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
  if (count <= ordinals.length) {
    return `${ordinals[count - 1]} attempt today`;
  }
  return `Attempt ${count} today`;
}
