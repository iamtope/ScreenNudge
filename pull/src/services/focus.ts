import { supabase } from '@/src/lib/supabase';
import { isLikelyNetworkError } from '@/src/lib/network';
import { toneForId } from '@/src/services/circle';

export type FocusSession = {
  id: string;
  userId: string;
  circleId: string;
  startedAt: string; // ISO
  expectedEndAt: string; // ISO
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

/** Mark a session as Screen-Time-enforced (best-effort; RLS scopes it to own rows). */
export async function markEnforced(sessionId: string): Promise<void> {
  await supabase.from('focus_sessions').update({ enforced: true }).eq('id', sessionId);
}

/** The caller's own active (not-yet-ended) session, if any. */
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

/** Live sessions of co-members in a circle (server computes liveness + elapsed). */
export async function getRoomActiveSessions(circleId: string): Promise<FocusRoomMember[]> {
  try {
    const { data, error } = await supabase.rpc('get_room_active_sessions', {
      p_circle_id: circleId,
    });
    if (error || !data) {
      return [];
    }
    return (data as RoomRow[]).map((row) => ({
      sessionId: row.id,
      userId: row.user_id,
      displayName: row.display_name?.trim() || 'Pull user',
      startedAt: row.started_at,
      expectedEndAt: row.expected_end_at,
      targetMinutes: row.target_minutes,
      elapsedMin: row.elapsed_min,
      tone: toneForId(row.user_id),
    }));
  } catch {
    return [];
  }
}

export async function getCircleFocusStats(
  circleId: string,
  window: FocusStatWindow,
): Promise<FocusStatRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_circle_focus_stats', {
      p_circle_id: circleId,
      p_window: window,
    });
    if (error || !data) {
      return [];
    }
    return (data as StatRow[]).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name?.trim() || 'Pull user',
      sessions: row.sessions,
      focusMinutes: row.focus_minutes,
      lastAt: row.last_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Subscribe to focus changes in a circle. Realtime is used purely as a "something
 * changed, refetch" trigger (payloads are ignored) — a silently-expired session
 * produces no event, so the room view must re-derive liveness against the clock.
 * Returns an unsubscribe function.
 */
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
