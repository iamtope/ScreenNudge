import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';

import {
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from '@/src/lib/storage';
import { darkPalette, lightPalette, type Palette } from '@/src/theme/palette';

type AppThemeColors = Palette;

type ThemeContextValue = {
  preference: ThemePreference;
  effectiveScheme: 'light' | 'dark';
  colors: AppThemeColors;
  ready: boolean;
  setPreference: (value: ThemePreference) => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

function effectivePreference(
  preference: ThemePreference,
  systemScheme: ReturnType<typeof useColorScheme>,
): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readThemePreference().then((stored) => {
      setPreferenceState(stored);
      Appearance.setColorScheme(stored === 'system' ? 'unspecified' : stored);
      setReady(true);
    });
  }, []);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    Appearance.setColorScheme(value === 'system' ? 'unspecified' : value);
    await writeThemePreference(value);
  }, []);

  const effectiveScheme = effectivePreference(preference, systemScheme);
  const colors = effectiveScheme === 'light' ? lightPalette : darkPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, effectiveScheme, colors, ready, setPreference }),
    [colors, effectiveScheme, preference, ready, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}

export function themePreferenceLabel(value: ThemePreference): string {
  switch (value) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    default:
      return 'System';
  }
}
