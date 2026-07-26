import React, { useState } from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';

import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function SimpleChallengeStep({ config, onComplete }: NudgeStepProps) {
  const phrase = config.kind === 'simpleChallenge' ? config.phrase : 'I choose this on purpose';
  const [value, setValue] = useState('');

  const normalized = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const matches = normalized(value) === normalized(phrase);

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>Type the phrase to continue:</Text>
      <Text style={{ color: palette.brass, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
        “{phrase}”
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type here"
        placeholderTextColor={palette.textMute}
        style={[nudgeStyles.input, { fontSize: 18 }]}
        multiline
      />
      <Pressable
        onPress={onComplete}
        disabled={!matches}
        style={[nudgeStyles.primary, !matches && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}
