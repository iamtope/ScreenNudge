import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/src/components/Screen';
import { nudgeStepRegistry } from '@/src/components/nudge';
import { getNudgeFlow, stepTitle } from '@/src/domain/nudge';
import type { ProtectionMode } from '@/src/domain/onboarding';
import { protectionModeName } from '@/src/domain/onboarding';
import {
  formatAttemptLabel,
  getLocalTodayOpens,
  recordOpenAttempt,
  recordOpenGranted,
  recordResist,
} from '@/src/services/attempts';
import { grantTemporaryAccess, refreshDailyShield } from '@/src/services/protection';
import { loadProtectionSnapshot } from '@/src/services/protectionStorage';
import { useOnboarding } from '@/src/state/onboarding';
import { useAchievements } from '@/src/state/achievements';
import { palette } from '@/src/theme/palette';

function resolveMode(raw: string | string[] | undefined, fallback: ProtectionMode): ProtectionMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'gentle' || value === 'balanced' || value === 'strong') {
    return value;
  }
  return fallback;
}

export default function InterceptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ app?: string; mode?: string }>();
  const { getProtection, protectionTargets } = useOnboarding();
  const { evaluate } = useAchievements();

  const appName = params.app && params.app !== 'app' ? String(params.app) : 'this app';
  const targetId = protectionTargets[0]?.id;
  const protection = targetId ? getProtection(targetId) : undefined;
  const mode = resolveMode(params.mode, protection?.mode ?? 'balanced');
  const dailyOpens = protection?.dailyOpens ?? 8;

  const [attemptLabel, setAttemptLabel] = useState('Opening attempt');
  const [opensOver, setOpensOver] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [ready, setReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const opens = await getLocalTodayOpens();
      const overBudget = opens >= dailyOpens;
      const count = await recordOpenAttempt({ appName, mode, opensOver: overBudget });
      if (cancelled) {
        return;
      }
      setAttemptLabel(formatAttemptLabel(count));
      setOpensOver(overBudget);
      setAttempt(count);
      setReady(true);
      // Keep the blocked-app shield's attempt count current for the next block.
      void refreshDailyShield(await loadProtectionSnapshot());
    })();
    return () => {
      cancelled = true;
    };
  }, [appName, dailyOpens, mode]);

  const flow = useMemo(() => getNudgeFlow(mode, opensOver, attempt), [mode, opensOver, attempt]);
  const stepConfig = flow.steps[stepIndex];
  const StepComponent = stepConfig ? nudgeStepRegistry[stepConfig.kind] : null;

  const advance = () => {
    setStepIndex((index) => Math.min(index + 1, flow.steps.length - 1));
  };

  const openAnyway = async () => {
    if (opening) {
      return;
    }
    setOpening(true);
    setOpenError(null);
    try {
      const pass = await grantTemporaryAccess(mode);
      if (!pass.granted) {
        setOpenError('Pull could not unlock your guarded apps. Try Re-apply Screen Time shields in Settings.');
        return;
      }
      await recordOpenGranted({ appName, mode, opensOver });
      router.replace('/(tabs)/home');
    } catch {
      setOpenError('Pull could not unlock your guarded apps. Try again.');
    } finally {
      setOpening(false);
    }
  };

  const resist = async () => {
    await recordResist({ appName, mode, opensOver });
    void evaluate(); // celebrate any newly-earned resist/streak achievement
    router.replace('/(tabs)/home');
  };

  if (!ready || !stepConfig || !StepComponent) {
    return (
      <Screen innerStyle={styles.inner}>
        <View style={styles.body} />
      </Screen>
    );
  }

  const progress = `${stepIndex + 1} / ${flow.steps.length}`;

  return (
    <Screen innerStyle={styles.inner}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{attemptLabel}</Text>
        <Text style={styles.progress}>{progress}</Text>
      </View>
      <Text style={styles.modeChip}>
        {protectionModeName(mode)} · {stepTitle(stepConfig.kind)}
        {opensOver ? ' · over your opens' : ''}
      </Text>
      <Text style={styles.title}>
        Unlock <Text style={styles.accent}>{appName}?</Text>
      </Text>

      <View style={styles.body}>
        <StepComponent
          config={stepConfig}
          mode={mode}
          appName={appName}
          opensOver={opensOver}
          onComplete={advance}
          onOpenAnyway={openAnyway}
          onStayOff={resist}
          isOpening={opening}
          openError={openError}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 20, gap: 6, flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: palette.brass, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  progress: { color: palette.textMute, fontSize: 13, letterSpacing: 1 },
  modeChip: {
    color: palette.textMute,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  title: { color: palette.text, fontSize: 36, lineHeight: 40, fontWeight: '700', marginBottom: 10 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  body: { flex: 1 },
});
