import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
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

/**
 * Mirror a locally-recorded usage event to the server (best-effort). The local
 * AsyncStorage store remains the immediate source of truth for the UI; this just
 * gives durable, cross-device, circle-visible history. Failures are swallowed.
 */
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
    // Best-effort; never block the local flow on network.
    return false;
  }
}

/** The signed-in user's raw usage events, for account-backed insights. */
export async function getMyUsageEvents(days = 31): Promise<AttemptEvent[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return [];
    }
    const { data, error } = await supabase.rpc('get_my_usage_events', {
      p_days: Math.max(1, Math.round(days)),
    });
    if (error || !data) {
      return [];
    }
    return (data as UsageEventRowRaw[])
      .map(toAttemptEvent)
      .filter((event): event is AttemptEvent => Boolean(event))
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  } catch {
    return [];
  }
}

/** Per-member attempt/open/resist counts for a circle, over a window. */
export async function getCircleUsageStats(
  circleId: string,
  window: UsageStatWindow,
): Promise<UsageStatRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_circle_usage_stats', {
      p_circle_id: circleId,
      p_window: window,
    });
    if (error || !data) {
      return [];
    }
    return (data as UsageStatRowRaw[]).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name?.trim() || 'Pull user',
      attempts: row.attempts,
      opens: row.opens,
      resists: row.comebacks,
    }));
  } catch {
    return [];
  }
}
