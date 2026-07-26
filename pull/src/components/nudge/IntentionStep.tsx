import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { intentionOptions } from '@/src/domain/nudge';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function IntentionStep({ appName, onComplete }: NudgeStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>Why are you opening {appName}?</Text>
      <View style={nudgeStyles.optionGrid}>
        {intentionOptions.map((intent) => {
          const active = selected === intent;
          return (
            <Pressable
              key={intent}
              onPress={() => setSelected(intent)}
              style={[nudgeStyles.option, active && nudgeStyles.optionActive]}
            >
              <Text style={[nudgeStyles.optionText, active && nudgeStyles.optionTextActive]}>
                {intent}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onComplete}
        disabled={!selected}
        style={[nudgeStyles.primary, !selected && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}
