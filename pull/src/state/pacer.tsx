import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readPacerEnabledFlag, writePacerEnabledFlag } from '@/src/lib/storage';

type PacerContextValue = {
  /** Whether the pacer bot is shown on the leaderboard + focus room. Default on. */
  enabled: boolean;
  /** False until the persisted flag has been read. */
  ready: boolean;
  setEnabled: (value: boolean) => void;
};

const PacerContext = createContext<PacerContextValue | null>(null);

export function PacerProvider({ children }: { children: React.ReactNode }) {
  // Optimistic default: on. Avoids a flash where the leaderboard gate is closed
  // for an existing pacer user before storage resolves.
  const [enabled, setEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void readPacerEnabledFlag().then((value) => {
      if (!mounted) return;
      setEnabledState(value);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    void writePacerEnabledFlag(value);
  }, []);

  const value = useMemo<PacerContextValue>(
    () => ({ enabled, ready, setEnabled }),
    [enabled, ready, setEnabled],
  );

  return <PacerContext.Provider value={value}>{children}</PacerContext.Provider>;
}

export function usePacer(): PacerContextValue {
  const ctx = useContext(PacerContext);
  if (!ctx) {
    throw new Error('usePacer must be used within a PacerProvider');
  }
  return ctx;
}
