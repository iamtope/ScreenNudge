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
  enabled: boolean;
  ready: boolean;
  setEnabled: (value: boolean) => void;
};

const PacerContext = createContext<PacerContextValue | null>(null);

export function PacerProvider({ children }: { children: React.ReactNode }) {
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
