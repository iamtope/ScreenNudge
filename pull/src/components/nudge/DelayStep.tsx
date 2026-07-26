import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, Pressable, View } from 'react-native';

import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function DelayStep({ config, onComplete }: NudgeStepProps) {
  const seconds = config.kind === 'delay' ? config.seconds : 5;
  const label = config.kind === 'delay' ? config.label : undefined;
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = setInterval(() => setRemaining((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const done = remaining <= 0;

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>{label ?? 'Hold on a moment before you continue.'}</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {!done ? <ActivityIndicator color={palette.brass} size="large" /> : null}
        <Text style={nudgeStyles.bigValue}>{done ? 'Ready' : remaining}</Text>
      </View>
      <Pressable
        onPress={onComplete}
        disabled={!done}
        style={[nudgeStyles.primary, !done && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>{done ? 'Continue' : `Wait ${remaining}s`}</Text>
      </Pressable>
    </View>
  );
}
