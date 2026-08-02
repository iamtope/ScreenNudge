import React, { useEffect, useRef, useState } from 'react';
import { Text, Pressable, View } from 'react-native';

import { isPedometerAvailable, watchSteps, type StepSubscription } from '@/src/services/pedometer';
import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function StepCounterStep({ config, onComplete }: NudgeStepProps) {
  const target = config.kind === 'stepCounter' ? config.steps : 25;
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const subRef = useRef<StepSubscription | null>(null);

  const fallbackSeconds = Math.max(15, Math.round(target / 2));
  const [remaining, setRemaining] = useState(fallbackSeconds);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const ok = await isPedometerAvailable();
      if (!mounted) {
        return;
      }
      setAvailable(ok);
      if (ok) {
        subRef.current = watchSteps((count) => setSteps(count));
      }
    })();
    return () => {
      mounted = false;
      subRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (available !== false || remaining <= 0) {
      return;
    }
    const timer = setInterval(() => setRemaining((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(timer);
  }, [available, remaining]);

  const done = available === false ? remaining <= 0 : steps >= target;

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>
        {available === false
          ? 'Step away from the screen for a moment.'
          : `Take ${target} steps to continue. Get up and move.`}
      </Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={nudgeStyles.bigValue}>
          {available === false ? remaining : Math.min(steps, target)}
        </Text>
        <Text style={{ color: palette.textMute, fontSize: 14 }}>
          {available === false ? 'seconds left' : `of ${target} steps`}
        </Text>
      </View>
      <Pressable
        onPress={onComplete}
        disabled={!done}
        style={[nudgeStyles.primary, !done && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>{done ? 'Continue' : 'Keep going…'}</Text>
      </Pressable>
    </View>
  );
}
