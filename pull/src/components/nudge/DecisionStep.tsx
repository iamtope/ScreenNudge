import React from 'react';
import { Text, Pressable, View } from 'react-native';

import { passMinutesForMode } from '@/src/services/protection';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function DecisionStep({
  mode,
  appName,
  onOpenAnyway,
  onStayOff,
  isOpening,
  openError,
}: NudgeStepProps) {
  const minutes = passMinutesForMode(mode);

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>
        You made it through the pause. Unlock a short pass, then return to {appName}.
      </Text>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 8 }}>
        {openError ? <Text style={nudgeStyles.error}>{openError}</Text> : null}
        <Pressable
          onPress={onOpenAnyway}
          disabled={isOpening}
          style={[nudgeStyles.secondary, isOpening && nudgeStyles.primaryDisabled]}
        >
          <Text style={nudgeStyles.secondaryLabel}>
            {isOpening ? 'Unlocking…' : `Unlock ${appName} (${minutes} min)`}
          </Text>
        </Pressable>
        <Pressable onPress={onStayOff} disabled={isOpening} style={nudgeStyles.ghost}>
          <Text style={nudgeStyles.ghostLabel}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}
