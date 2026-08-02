import { supabase } from '@/src/lib/supabase';
import { normalizedDisplayName } from '@/src/lib/brand';
import { isLikelyNetworkError } from '@/src/lib/network';
import { toneForId } from '@/src/services/circle';

export type FocusSession = {
  id: string;
  userId: string;
  circleId: string;
  startedAt: string;
  expectedEndAt: string;
  targetMinutes: number;
  endedAt: string | null;
  enforced: boolean;
};

export type FocusRoomMember = {
  sessionId: string;
  userId: string;
  displayName: string;
  startedAt: string;
  expectedEndAt: string;
  targetMinutes: number;
  elapsedMin: number;
  tone: string;
};

export type FocusStatWindow = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export type FocusStatRow = {
  userId: string;
  displayName: string;
  sessions: number;
  focusMinutes: number;
  lastAt: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  circle_id: string;
  started_at: string;
  target_minutes: number;
  expected_end_at: string;
  ended_at: string | null;
  enforced: boolean;
};

type RoomRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  started_at: string;
  expected_end_at: string;
  target_minutes: number;
  elapsed_min: number;
  enforced: boolean;
};

type StatRow = {
  user_id: string;
  display_name: string | null;
  sessions: number;
  focus_minutes: number;
  last_at: string | null;
};

const focusStatsCache = new Map<string, FocusStatRow[]>();
const roomCache = new Map<string, FocusRoomMember[]>();

function toFocusSession(row: SessionRow): FocusSession {
  return {
    id: row.id,
    userId: row.user_id,
    circleId: row.circle_id,
    startedAt: row.started_at,
    expectedEndAt: row.expected_end_at,
    targetMinutes: row.target_minutes,
    endedAt: row.ended_at,
    enforced: row.enforced,
  };
}

export async function startFocus(targetMinutes: number): Promise<FocusSession> {
  try {
    const { data, error } = await supabase.rpc('start_focus', {
      p_target_minutes: targetMinutes,
    });
    if (error || !data) {
      throw new Error(error?.message ?? 'Could not start focus session');
    }
    return toFocusSession(data as SessionRow);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Could not start focus session';
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function endFocus(
  sessionId: string,
  reason: 'manual' | 'completed' = 'manual',
): Promise<void> {
  const { error } = await supabase.rpc('end_focus', {
    p_id: sessionId,
    p_reason: reason,
  });
  if (error) {
    throw error;
  }
}

export async function markEnforced(sessionId: string): Promise<void> {
  await supabase.from('focus_sessions').update({ enforced: true }).eq('id', sessionId);
}

export async function getMyActiveSession(): Promise<FocusSession | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_active_session');
    if (error) {
      if (isLikelyNetworkError(error)) {
        throw new Error(error.message);
      }
      return null;
    }
    if (!data) {
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? toFocusSession(row as SessionRow) : null;
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      throw error instanceof Error ? error : new Error('Network request failed');
    }
    return null;
  }
}

export async function getRoomActiveSessions(circleId: string): Promise<FocusRoomMember[]> {
  try {
    const { data, error } = await supabase.rpc('get_room_active_sessions', {
      p_circle_id: circleId,
    });
    if (error || !data) {
      return roomCache.get(circleId) ?? [];
    }
    const rows = (data as RoomRow[]).map((row) => ({
      sessionId: row.id,
      userId: row.user_id,
      displayName: normalizedDisplayName(row.display_name),
      startedAt: row.started_at,
      expectedEndAt: row.expected_end_at,
      targetMinutes: row.target_minutes,
      elapsedMin: row.elapsed_min,
      tone: toneForId(row.user_id),
    }));
    roomCache.set(circleId, rows);
    return rows;
  } catch {
    return roomCache.get(circleId) ?? [];
  }
}

export async function getCircleFocusStats(
  circleId: string,
  window: FocusStatWindow,
): Promise<FocusStatRow[]> {
  const cacheKey = `${circleId}:${window}`;
  try {
    const { data, error } = await supabase.rpc('get_circle_focus_stats', {
      p_circle_id: circleId,
      p_window: window,
    });
    if (error || !data) {
      return focusStatsCache.get(cacheKey) ?? [];
    }
    const rows = (data as StatRow[]).map((row) => ({
      userId: row.user_id,
      displayName: normalizedDisplayName(row.display_name),
      sessions: row.sessions,
      focusMinutes: row.focus_minutes,
      lastAt: row.last_at,
    }));
    focusStatsCache.set(cacheKey, rows);
    return rows;
  } catch {
    return focusStatsCache.get(cacheKey) ?? [];
  }
}

export function subscribeRoom(circleId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`focus:circle:${circleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'focus_sessions',
        filter: `circle_id=eq.${circleId}`,
      },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onChange();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
