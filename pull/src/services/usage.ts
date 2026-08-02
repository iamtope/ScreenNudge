import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { normalizedDisplayName } from '@/src/lib/brand';
import type { ProtectionMode } from '@/src/domain/onboarding';
import type { AttemptEvent, AttemptOutcome } from '@/src/services/attempts';

export type UsageStatWindow = 'today' | 'week' | 'all';

export type UsageStatRow = {
  userId: string;
  displayName: string;
  attempts: number;
  opens: number;
  resists: number;
};

type UsageStatRowRaw = {
  user_id: string;
  display_name: string | null;
  attempts: number;
  opens: number;
  comebacks: number;
};

type UsageEventRowRaw = {
  client_event_id: string | null;
  occurred_at: string;
  outcome: AttemptOutcome;
  app_name: string | null;
  mode: ProtectionMode | null;
  opens_over: boolean | null;
};

const myUsageEventsCache = new Map<string, AttemptEvent[]>();
const circleUsageStatsCache = new Map<string, UsageStatRow[]>();

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toAttemptEvent(row: UsageEventRowRaw): AttemptEvent | null {
  const occurred = new Date(row.occurred_at);
  if (Number.isNaN(occurred.getTime())) {
    return null;
  }
  const outcome =
    row.outcome === 'attempt' || row.outcome === 'open' || row.outcome === 'comeback'
      ? row.outcome
      : null;
  if (!outcome) {
    return null;
  }
  const mode =
    row.mode === 'gentle' || row.mode === 'strong' || row.mode === 'balanced'
      ? row.mode
      : 'balanced';
  return {
    id:
      row.client_event_id ??
      `server:${occurred.toISOString()}:${outcome}:${row.app_name ?? ''}:${mode}:${Boolean(row.opens_over)}`,
    occurredAt: occurred.toISOString(),
    date: dateKey(occurred),
    hour: occurred.getHours(),
    outcome,
    appName: row.app_name?.trim() || 'Guarded apps',
    mode,
    opensOver: Boolean(row.opens_over),
  };
}

export async function logUsage(
  outcome: AttemptOutcome,
  meta: {
    appName?: string;
    mode?: ProtectionMode;
    opensOver?: boolean;
    occurredAt?: string;
    clientEventId?: string;
  } = {},
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return false;
    }
    const { error } = await supabase.rpc('log_usage', {
      p_outcome: outcome,
      p_app_name: meta.appName ?? null,
      p_mode: meta.mode ?? null,
      p_opens_over: meta.opensOver ?? false,
      p_occurred_at: meta.occurredAt ?? null,
      p_client_event_id: meta.clientEventId ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function getMyUsageEvents(days = 31): Promise<AttemptEvent[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  let cacheKey: string | null = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return [];
    }
    cacheKey = `${sessionData.session.user.id}:${Math.max(1, Math.round(days))}`;
    const { data, error } = await supabase.rpc('get_my_usage_events', {
      p_days: Math.max(1, Math.round(days)),
    });
    if (error || !data) {
      return myUsageEventsCache.get(cacheKey) ?? [];
    }
    const events = (data as UsageEventRowRaw[])
      .map(toAttemptEvent)
      .filter((event): event is AttemptEvent => Boolean(event))
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    myUsageEventsCache.set(cacheKey, events);
    return events;
  } catch {
    return cacheKey ? (myUsageEventsCache.get(cacheKey) ?? []) : [];
  }
}

export async function getCircleUsageStats(
  circleId: string,
  window: UsageStatWindow,
): Promise<UsageStatRow[]> {
  const cacheKey = `${circleId}:${window}`;
  try {
    const { data, error } = await supabase.rpc('get_circle_usage_stats', {
      p_circle_id: circleId,
      p_window: window,
    });
    if (error || !data) {
      return circleUsageStatsCache.get(cacheKey) ?? [];
    }
    const rows = (data as UsageStatRowRaw[]).map((row) => ({
      userId: row.user_id,
      displayName: normalizedDisplayName(row.display_name),
      attempts: row.attempts,
      opens: row.opens,
      resists: row.comebacks,
    }));
    circleUsageStatsCache.set(cacheKey, rows);
    return rows;
  } catch {
    return circleUsageStatsCache.get(cacheKey) ?? [];
  }
}
