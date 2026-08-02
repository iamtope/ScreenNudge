import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  readPullPlusFlag,
  writePullPlusFlag,
} from '@/src/lib/storage';
import { usePacer } from '@/src/state/pacer';
import {
  useHasCircle,
  useSession,
} from '@/src/state/session';

export type GateReason = 'account' | 'circle' | 'pullPlus';

export const GATE_COPY: Record<
  GateReason,
  { title: string; subtitle: string; cta: string }
> = {
  account: {
    title: 'Create your account',
    subtitle: 'Save your progress, protect your apps, and unlock social features.',
    cta: 'Get started',
  },
  circle: {
    title: 'Join a circle',
    subtitle: 'Free with your account. See how your friends are doing and focus together.',
    cta: 'Build your circle',
  },
  pullPlus: {
    title: 'ScreenNudge+',
    subtitle: 'Deeper insights · advanced controls',
    cta: 'Unlock ScreenNudge+',
  },
};

type AccessContextValue = {
  hasAccount: boolean;
  hasCircle: boolean;
  isPullPlus: boolean;
  isLoading: boolean;
  setPullPlus: (value: boolean) => void;
  gateFor: (requirement: GateReason) => GateReason | null;
};

const AccessContext = createContext<AccessContextValue | null>(null);

function AccessStateProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: sessionLoading } = useSession();
  const { enabled: pacerEnabled } = usePacer();
  const hasCircle = useHasCircle() || pacerEnabled;
  const [isPullPlus, setPullPlusState] = useState(false);
  const [pullPlusLoaded, setPullPlusLoaded] = useState(false);

  useEffect(() => {
    readPullPlusFlag().then((active) => {
      setPullPlusState(active);
      setPullPlusLoaded(true);
    });
  }, []);

  const setPullPlus = useCallback((value: boolean) => {
    setPullPlusState(value);
    void writePullPlusFlag(value);
  }, []);

  const hasAccount = Boolean(user);
  const isLoading = sessionLoading || !pullPlusLoaded;

  const gateFor = useCallback(
    (requirement: GateReason): GateReason | null => {
      if (requirement === 'account') {
        return hasAccount ? null : 'account';
      }
      if (requirement === 'circle') {
        if (!hasAccount) return 'account';
        return hasCircle ? null : 'circle';
      }
      if (requirement === 'pullPlus') {
        if (!hasAccount) return 'account';
        return isPullPlus ? null : 'pullPlus';
      }
      return null;
    },
    [hasAccount, hasCircle, isPullPlus],
  );

  const value = useMemo<AccessContextValue>(
    () => ({
      hasAccount,
      hasCircle,
      isPullPlus,
      isLoading,
      setPullPlus,
      gateFor,
    }),
    [hasAccount, hasCircle, isPullPlus, isLoading, setPullPlus, gateFor],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  return <AccessStateProvider>{children}</AccessStateProvider>;
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return ctx;
}

export function usePullPlus(): boolean {
  return useAccess().isPullPlus;
}

export function useSetPullPlus(): (active: boolean) => void {
  return useAccess().setPullPlus;
}

export function useGate(requirement: GateReason) {
  const access = useAccess();
  const blockedBy = access.gateFor(requirement);
  return {
    unlocked: blockedBy === null,
    blockedBy,
  };
}
