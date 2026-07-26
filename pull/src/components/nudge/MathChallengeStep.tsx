import React, { useMemo, useState } from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';

import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

function generate(difficulty: 'easy' | 'medium' | 'hard') {
  const ranges = { easy: 9, medium: 19, hard: 49 } as const;
  const max = ranges[difficulty];
  const a = Math.floor(Math.random() * max) + 2;
  const b = Math.floor(Math.random() * max) + 2;
  if (difficulty === 'hard') {
    return { prompt: `${a} × ${b}`, answer: a * b };
  }
  return { prompt: `${a} + ${b}`, answer: a + b };
}

export function MathChallengeStep({ config, onComplete }: NudgeStepProps) {
  const difficulty = config.kind === 'mathChallenge' ? config.difficulty : 'medium';
  const problem = useMemo(() => generate(difficulty), [difficulty]);
  const [value, setValue] = useState('');

  const correct = Number(value) === problem.answer;

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>Solve to continue</Text>
      <Text style={{ color: palette.text, fontSize: 42, fontWeight: '700', textAlign: 'center' }}>
        {problem.prompt} = ?
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        placeholder="?"
        placeholderTextColor={palette.textMute}
        style={nudgeStyles.input}
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
