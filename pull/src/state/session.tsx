import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';
import {
  getMyCircle,
  getOrCreateMyProfile,
  type CircleData,
  type CircleProfile,
} from '@/src/services/circle';
import { syncLocalAttemptEvents } from '@/src/services/attempts';
import { displayNameFromAuthUser, syncProfileDisplayName } from '@/src/services/profile';

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  profile: CircleProfile | null;
  circle: CircleData | null;
  isLoading: boolean;
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
  refreshCircle: () => Promise<CircleProfile | null>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CircleProfile | null>(null);
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  const loadCircle = useCallback(async (userId: string, authUser?: User | null): Promise<CircleProfile | null> => {
    const nextCircle = await getMyCircle(userId);
    setCircle(nextCircle);

    const meFromCircle = nextCircle?.members.find((member) => member.id === userId) ?? null;
    if (meFromCircle?.inviteCode) {
      setProfile(meFromCircle);
      return meFromCircle;
    }

    const directProfile = await getOrCreateMyProfile(userId);
    if (directProfile?.inviteCode) {
      setProfile(directProfile);
      return directProfile;
    }

    if (authUser) {
      const fromMeta = displayNameFromAuthUser(authUser);
      if (fromMeta) {
        const fallback: CircleProfile = {
          id: userId,
          displayName: fromMeta,
          inviteCode: nextCircle?.inviteCode ?? directProfile?.inviteCode ?? '',
          initial: fromMeta.charAt(0).toUpperCase(),
          tone: '#c9b890',
        };
        setProfile(fallback);
        return fallback.inviteCode ? fallback : null;
      }
    }

    setProfile(directProfile);
    return directProfile?.inviteCode ? directProfile : null;
  }, []);

  const refreshCircle = useCallback(async (): Promise<CircleProfile | null> => {
    const userId = session?.user.id;
    if (!userId) {
      setCircle(null);
      setProfile(null);
      return null;
    }
    return loadCircle(userId, session.user);
  }, [loadCircle, session?.user]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);

      if (nextSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const fromMeta = displayNameFromAuthUser(nextSession.user);
        if (fromMeta) {
          await syncProfileDisplayName(nextSession.user, fromMeta);
        }
        await syncLocalAttemptEvents();
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setCircle(null);
      setProfile(null);
      return;
    }

    loadCircle(session.user.id, session.user);
    void syncLocalAttemptEvents();

    if (pendingInviteCode) {
      const code = pendingInviteCode;
      setPendingInviteCode(null);
      void (async () => {
        try {
          const { joinWithCode } = await import('@/src/services/circle');
          await joinWithCode(code);
          await loadCircle(session.user.id, session.user);
        } catch {
          // Invite screen or join flow can retry
        }
      })();
    }
  }, [loadCircle, pendingInviteCode, session?.user, setPendingInviteCode]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      circle,
      isLoading,
      pendingInviteCode,
      setPendingInviteCode,
      refreshCircle,
    }),
    [session, profile, circle, isLoading, pendingInviteCode, refreshCircle],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

export function useCircleMembers(): CircleProfile[] {
  const { circle, user } = useSession();
  if (!circle || !user) {
    return [];
  }
  return circle.members.filter((member) => member.id !== user.id);
}

export function useHasCircle(): boolean {
  const { circle } = useSession();
  return (circle?.members.length ?? 0) >= 2;
}
