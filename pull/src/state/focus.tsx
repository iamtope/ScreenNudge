import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSession } from '@/src/state/session';
import {
  endFocus,
  getMyActiveSession,
  getRoomActiveSessions,
  markEnforced,
  startFocus,
  subscribeRoom,
  type FocusRoomMember,
  type FocusSession,
} from '@/src/services/focus';
import { endFocusEnforcement, startFocusEnforcement } from '@/src/services/protection';

const GRACE_MS = 2 * 60 * 1000;
const REFETCH_INTERVAL_MS = 25_000;
const CACHE_KEY = 'pull:focus:active';
const LOCAL_SESSION_PREFIX = 'local:';

type FocusContextValue = {
  activeSession: FocusSession | null;
  isFocusing: boolean;
  enforced: boolean;
  roomMembers: FocusRoomMember[];
  start: (targetMinutes: number) => Promise<void>;
  end: (reason?: 'manual' | 'completed') => Promise<void>;
  refresh: () => void;
};

type CachedFocus = {
  id: string;
  startedAt: string;
  expectedEndAt: string;
  targetMinutes: number;
  circleId: string;
  enforced: boolean;
};

const FocusContext = createContext<FocusContextValue | null>(null);

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function isLive(expectedEndAt: string): boolean {
  return Date.now() < toMs(expectedEndAt) + GRACE_MS;
}

function remainingMinutes(expectedEndAt: string): number {
  return Math.max(1, Math.ceil((toMs(expectedEndAt) - Date.now()) / 60_000));
}

function cachedToSession(c: CachedFocus, userId: string): FocusSession {
  return {
    id: c.id,
    userId,
    circleId: c.circleId,
    startedAt: c.startedAt,
    expectedEndAt: c.expectedEndAt,
    targetMinutes: c.targetMinutes,
    endedAt: null,
    enforced: c.enforced,
  };
}

function isLocalSessionId(id: string): boolean {
  return id.startsWith(LOCAL_SESSION_PREFIX);
}

function createLocalSession(targetMinutes: number, userId: string, circleId: string | null): FocusSession {
  const startedAt = new Date();
  const expectedEndAt = new Date(startedAt.getTime() + targetMinutes * 60_000);
  return {
    id: `${LOCAL_SESSION_PREFIX}${startedAt.getTime()}`,
    userId,
    circleId: circleId ?? 'local',
    startedAt: startedAt.toISOString(),
    expectedEndAt: expectedEndAt.toISOString(),
    targetMinutes,
    endedAt: null,
    enforced: false,
  };
}

async function readCache(): Promise<CachedFocus | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedFocus) : null;
  } catch {
    return null;
  }
}

async function writeCache(session: FocusSession, enforced: boolean): Promise<void> {
  try {
    const payload: CachedFocus = {
      id: session.id,
      startedAt: session.startedAt,
      expectedEndAt: session.expectedEndAt,
      targetMinutes: session.targetMinutes,
      circleId: session.circleId,
      enforced,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
  }
}

async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
  }
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { user, circle } = useSession();
  const userId = user?.id ?? null;
  const circleId = circle?.circleId ?? null;

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [enforced, setEnforced] = useState(false);
  const [roomMembers, setRoomMembers] = useState<FocusRoomMember[]>([]);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionVersionRef = useRef(0);

  const refetchRoom = useCallback(async () => {
    if (!circleId) {
      setRoomMembers([]);
      return;
    }
    try {
      const members = await getRoomActiveSessions(circleId);
      setRoomMembers(members.filter((member) => member.userId !== userId));
    } catch {
    }
  }, [circleId, userId]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) {
      clearTimeout(refetchTimer.current);
    }
    refetchTimer.current = setTimeout(() => {
      void refetchRoom();
    }, 300);
  }, [refetchRoom]);

  const reconcileMyFocus = useCallback(async () => {
    if (activeSession && isLocalSessionId(activeSession.id)) {
      if (isLive(activeSession.expectedEndAt)) {
        return;
      }
      await endFocusEnforcement();
      await clearCache();
      setActiveSession(null);
      setEnforced(false);
      return;
    }

    let db: FocusSession | null = null;
    try {
      db = await getMyActiveSession();
    } catch {
      return;
    }
    if (!db) {
      if (activeSession && isLive(activeSession.expectedEndAt)) {
        return;
      }
      if (activeSession) {
        await endFocusEnforcement();
        await clearCache();
      }
      setActiveSession(null);
      setEnforced(false);
      return;
    }
    if (isLive(db.expectedEndAt)) {
      setActiveSession(db);
    } else {
      try {
        await endFocus(db.id, 'completed');
      } catch {
      }
      await endFocusEnforcement();
      await clearCache();
      setActiveSession(null);
      setEnforced(false);
    }
  }, [activeSession]);

  const restore = useCallback(async () => {
    const cached = await readCache();
    const hasLiveCache = Boolean(cached && isLive(cached.expectedEndAt) && userId);
    if (hasLiveCache && cached && userId) {
      const cachedSession = cachedToSession(cached, userId);
      setActiveSession(cachedSession);
      setEnforced(cached.enforced);
      if (isLocalSessionId(cached.id)) {
        const { enforced: stillEnforced } = await startFocusEnforcement(
          remainingMinutes(cached.expectedEndAt),
        );
        setEnforced(stillEnforced);
        await writeCache(cachedSession, stillEnforced);
        return;
      }
    }

    let db: FocusSession | null = null;
    try {
      db = await getMyActiveSession();
    } catch {
      if (cached && isLive(cached.expectedEndAt) && userId) {
        return;
      }
      db = null;
    }
    if (!db) {
      if (hasLiveCache) {
        return;
      }
      if (cached) {
        await endFocusEnforcement();
        await clearCache();
      }
      setActiveSession(null);
      setEnforced(false);
      return;
    }

    if (isLive(db.expectedEndAt)) {
      setActiveSession(db);
      if (cached?.enforced) {
        const { enforced: stillEnforced } = await startFocusEnforcement(
          remainingMinutes(db.expectedEndAt),
        );
        setEnforced(stillEnforced);
        await writeCache(db, stillEnforced);
      } else {
        await writeCache(db, false);
      }
    } else {
      try {
        await endFocus(db.id, 'completed');
      } catch {
      }
      await endFocusEnforcement();
      await clearCache();
      setActiveSession(null);
      setEnforced(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      sessionVersionRef.current += 1;
      setActiveSession(null);
      setEnforced(false);
      return;
    }
    void restore();
  }, [userId, restore]);

  useEffect(() => {
    if (!circleId) {
      setRoomMembers([]);
      return;
    }
    const unsubscribe = subscribeRoom(circleId, scheduleRefetch);
    const interval = setInterval(() => {
      void refetchRoom();
    }, REFETCH_INTERVAL_MS);
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetchRoom();
        void reconcileMyFocus();
      }
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
      appSub.remove();
    };
  }, [circleId, scheduleRefetch, refetchRoom, reconcileMyFocus]);

  const start = useCallback(
    async (targetMinutes: number) => {
      if (!userId) {
        throw new Error('Sign in to start a focus session.');
      }

      const version = sessionVersionRef.current + 1;
      sessionVersionRef.current = version;
      const localSession = createLocalSession(targetMinutes, userId, circleId);
      setActiveSession(localSession);

      let didEnforce = false;
      try {
        ({ enforced: didEnforce } = await startFocusEnforcement(targetMinutes));
      } catch {
      }
      setEnforced(didEnforce);
      await writeCache(localSession, didEnforce);
      scheduleRefetch();

      void startFocus(targetMinutes)
        .then(async (serverSession) => {
          if (sessionVersionRef.current !== version) {
            try {
              await endFocus(serverSession.id, 'manual');
            } catch {
            }
            return;
          }
          setActiveSession(serverSession);
          await writeCache(serverSession, didEnforce);
          if (didEnforce) {
            void markEnforced(serverSession.id);
          }
          scheduleRefetch();
        })
        .catch(() => {
        });
    },
    [circleId, scheduleRefetch, userId],
  );

  const end = useCallback(
    async (reason: 'manual' | 'completed' = 'manual') => {
      sessionVersionRef.current += 1;
      const current = activeSession;
      setActiveSession(null);
      setEnforced(false);
      if (current && !isLocalSessionId(current.id)) {
        try {
          await endFocus(current.id, reason);
        } catch {
        }
      }
      await endFocusEnforcement();
      await clearCache();
      scheduleRefetch();
    },
    [activeSession, scheduleRefetch],
  );

  const value = useMemo<FocusContextValue>(
    () => ({
      activeSession,
      isFocusing: activeSession != null,
      enforced,
      roomMembers,
      start,
      end,
      refresh: scheduleRefetch,
    }),
    [activeSession, enforced, roomMembers, start, end, scheduleRefetch],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return ctx;
}
