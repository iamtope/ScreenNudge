import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readHiddenMembers, writeHiddenMembers } from '@/src/lib/storage';

type HiddenMembersContextValue = {
  /** Member/bot ids hidden from the circle leaderboard. */
  hidden: Set<string>;
  isHidden: (id: string) => boolean;
  hide: (id: string) => void;
  unhide: (id: string) => void;
};

const HiddenMembersContext = createContext<HiddenMembersContextValue | null>(null);

export function HiddenMembersProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    void readHiddenMembers().then((ids) => {
      if (mounted) setHidden(new Set(ids));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const hide = useCallback((id: string) => {
    setHidden((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      void writeHiddenMembers([...next]);
      return next;
    });
  }, []);

  const unhide = useCallback((id: string) => {
    setHidden((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      void writeHiddenMembers([...next]);
      return next;
    });
  }, []);

  const value = useMemo<HiddenMembersContextValue>(
    () => ({ hidden, isHidden: (id) => hidden.has(id), hide, unhide }),
    [hidden, hide, unhide],
  );

  return <HiddenMembersContext.Provider value={value}>{children}</HiddenMembersContext.Provider>;
}

export function useHiddenMembers(): HiddenMembersContextValue {
  const ctx = useContext(HiddenMembersContext);
  if (!ctx) {
    throw new Error('useHiddenMembers must be used within a HiddenMembersProvider');
  }
  return ctx;
}
