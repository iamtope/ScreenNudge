import {
  DEFAULT_DAILY_LIMIT_MIN,
  DEFAULT_DAILY_OPENS,
  DEFAULT_PROTECTION_MODE,
  type ProtectionMode,
} from '@/src/domain/onboarding';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import type { AppProtection } from '@/src/state/onboarding';
import type { ProtectionSnapshot } from '@/src/services/protectionStorage';

const SCREEN_TIME_PROTECTION_ID = 'screen-time-selection';

export type SyncedProtectionPreferences = {
  dailyLimitMin: number;
  dailyOpens: number;
  mode: ProtectionMode;
  bedtimeEnabled: boolean;
  bedtimeStart: number;
  bedtimeEnd: number;
};

type ProtectionPreferenceRow = {
  daily_limit_min: number | null;
  daily_opens: number | null;
  mode: string | null;
  bedtime_enabled: boolean | null;
  bedtime_start: number | null;
  bedtime_end: number | null;
};

const fallback: SyncedProtectionPreferences = {
  dailyLimitMin: DEFAULT_DAILY_LIMIT_MIN,
  dailyOpens: DEFAULT_DAILY_OPENS,
  mode: DEFAULT_PROTECTION_MODE,
  bedtimeEnabled: false,
  bedtimeStart: 22 * 60,
  bedtimeEnd: 7 * 60,
};

function clampInt(value: number | null | undefined, min: number, max: number, fallbackValue: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallbackValue;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeMode(value: string | null | undefined): ProtectionMode {
  return value === 'gentle' || value === 'strong' || value === 'balanced'
    ? value
    : DEFAULT_PROTECTION_MODE;
}

function fromRow(row: ProtectionPreferenceRow | null): SyncedProtectionPreferences | null {
  if (!row) {
    return null;
  }
  return {
    dailyLimitMin: clampInt(row.daily_limit_min, 1, 240, fallback.dailyLimitMin),
    dailyOpens: clampInt(row.daily_opens, 1, 99, fallback.dailyOpens),
    mode: normalizeMode(row.mode),
    bedtimeEnabled: Boolean(row.bedtime_enabled),
    bedtimeStart: clampInt(row.bedtime_start, 0, 1439, fallback.bedtimeStart),
    bedtimeEnd: clampInt(row.bedtime_end, 0, 1439, fallback.bedtimeEnd),
  };
}

function primaryProtection(snapshot: ProtectionSnapshot): AppProtection {
  return (
    snapshot.protections[SCREEN_TIME_PROTECTION_ID] ??
    Object.values(snapshot.protections)[0] ??
    {
      dailyLimitMin: DEFAULT_DAILY_LIMIT_MIN,
      dailyOpens: DEFAULT_DAILY_OPENS,
      mode: snapshot.globalMode ?? DEFAULT_PROTECTION_MODE,
    }
  );
}

export function preferencesFromSnapshot(snapshot: ProtectionSnapshot): SyncedProtectionPreferences {
  const protection = primaryProtection(snapshot);
  return {
    dailyLimitMin: protection.dailyLimitMin,
    dailyOpens: protection.dailyOpens,
    mode: protection.mode,
    bedtimeEnabled: snapshot.bedtimeEnabled,
    bedtimeStart: snapshot.bedtimeStart,
    bedtimeEnd: snapshot.bedtimeEnd,
  };
}

export function applyPreferencesToSnapshot(
  snapshot: ProtectionSnapshot,
  preferences: SyncedProtectionPreferences,
): ProtectionSnapshot {
  const protection: AppProtection = {
    dailyLimitMin: preferences.dailyLimitMin,
    dailyOpens: preferences.dailyOpens,
    mode: preferences.mode,
  };
  const nextProtections = { ...snapshot.protections };
  const targetIds = Object.keys(nextProtections);
  if (targetIds.length) {
    for (const id of targetIds) {
      nextProtections[id] = { ...nextProtections[id], ...protection };
    }
  } else {
    nextProtections[SCREEN_TIME_PROTECTION_ID] = protection;
  }
  return {
    ...snapshot,
    protections: nextProtections,
    globalMode: preferences.mode,
    bedtimeEnabled: preferences.bedtimeEnabled,
    bedtimeStart: preferences.bedtimeStart,
    bedtimeEnd: preferences.bedtimeEnd,
  };
}

export function snapshotFromPreferences(preferences: SyncedProtectionPreferences): ProtectionSnapshot {
  const protection: AppProtection = {
    dailyLimitMin: preferences.dailyLimitMin,
    dailyOpens: preferences.dailyOpens,
    mode: preferences.mode,
  };
  return {
    version: 1,
    usingScreenTime: false,
    screenTimeAppCount: 0,
    selectedAppIds: [],
    protections: {
      [SCREEN_TIME_PROTECTION_ID]: protection,
    },
    activated: false,
    globalMode: preferences.mode,
    bedtimeEnabled: preferences.bedtimeEnabled,
    bedtimeStart: preferences.bedtimeStart,
    bedtimeEnd: preferences.bedtimeEnd,
  };
}

export async function loadProtectionPreferences(): Promise<SyncedProtectionPreferences | null> {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return null;
    }
    const { data, error } = await supabase.rpc('get_my_protection_preferences');
    if (error || !data) {
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return fromRow(row as ProtectionPreferenceRow | null);
  } catch {
    return null;
  }
}

export async function syncProtectionPreferences(snapshot: ProtectionSnapshot): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const preferences = preferencesFromSnapshot(snapshot);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return;
    }
    await supabase.rpc('upsert_protection_preferences', {
      p_daily_limit_min: preferences.dailyLimitMin,
      p_daily_opens: preferences.dailyOpens,
      p_mode: preferences.mode,
      p_bedtime_enabled: preferences.bedtimeEnabled,
      p_bedtime_start: preferences.bedtimeStart,
      p_bedtime_end: preferences.bedtimeEnd,
    });
  } catch {
    // Best-effort; device-local protection remains the source of truth.
  }
}
