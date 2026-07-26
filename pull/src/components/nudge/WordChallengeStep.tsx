import React, { useMemo, useState } from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';

import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

const WORDS = [
  'present',
  'mindful',
  'breathe',
  'focus',
  'intention',
  'patience',
  'attention',
  'choose',
  'enough',
  'pause',
];

function scramble(word: string): string {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const result = letters.join('');
  return result === word ? scramble(word) : result;
}

export function WordChallengeStep({ onComplete }: NudgeStepProps) {
  const word = useMemo(() => WORDS[Math.floor(Math.random() * WORDS.length)], []);
  const scrambled = useMemo(() => scramble(word), [word]);
  const [value, setValue] = useState('');

  const correct = value.trim().toLowerCase() === word;

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>Unscramble the word to continue</Text>
      <Text style={{ color: palette.brass, fontSize: 36, fontWeight: '800', textAlign: 'center', letterSpacing: 4 }}>
        {scrambled.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type the word"
        placeholderTextColor={palette.textMute}
        style={[nudgeStyles.input, { fontSize: 20 }]}
      />
      <Pressable
        onPress={onComplete}
        disabled={!correct}
        style={[nudgeStyles.primary, !correct && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}
