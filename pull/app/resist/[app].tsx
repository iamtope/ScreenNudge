import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/src/components/Screen';
import type { ProtectionMode } from '@/src/domain/onboarding';
import { recordResist } from '@/src/services/attempts';
import { useAchievements } from '@/src/state/achievements';
import { palette } from '@/src/theme/palette';

function resolveMode(raw: string | string[] | undefined): ProtectionMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'gentle' || value === 'balanced' || value === 'strong') {
    return value;
  }
  return 'balanced';
}

export default function ResistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ app?: string; mode?: string }>();
  const { evaluate } = useAchievements();
  const recordedRef = useRef(false);

  const appName = params.app && params.app !== 'app' ? String(params.app) : 'this app';
  const mode = useMemo(() => resolveMode(params.mode), [params.mode]);

  useEffect(() => {
    if (recordedRef.current) {
      return;
    }
    recordedRef.current = true;
    void (async () => {
      try {
        await recordResist({ appName, mode });
        void evaluate();
      } finally {
        router.replace('/(tabs)/home');
      }
    })();
  }, [appName, evaluate, mode, router]);

  return (
    <Screen innerStyle={styles.inner}>
      <View style={styles.card}>
        <ActivityIndicator color={palette.brass} />
        <Text style={styles.title}>Resisted</Text>
        <Text style={styles.body}>Keeping {appName} blocked.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 20, justifyContent: 'center' },
  card: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  title: { color: palette.text, fontSize: 20, fontWeight: '700' },
  body: { color: palette.textMute, fontSize: 15 },
});
