import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';
import { nudgeStyles } from './styles';
import type { NudgeStepProps } from './types';

export function BreatheStep({ config, onComplete }: NudgeStepProps) {
  const seconds = config.kind === 'breathe' ? config.seconds : 4;
  const [remaining, setRemaining] = useState(seconds);
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.7,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const done = remaining <= 0;

  return (
    <View style={nudgeStyles.block}>
      <Text style={nudgeStyles.hint}>Breathe with the circle. Let the urge settle.</Text>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { transform: [{ scale }] }]}>
          <Text style={styles.count}>{done ? '✓' : remaining}</Text>
        </Animated.View>
      </View>
      <Pressable
        onPress={onComplete}
        disabled={!done}
        style={[nudgeStyles.primary, !done && nudgeStyles.primaryDisabled]}
      >
        <Text style={nudgeStyles.primaryLabel}>{done ? 'Continue' : `Breathe… ${remaining}s`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 180,
    height: 180,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: palette.brass,
    backgroundColor: palette.brassSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: palette.brass, fontSize: 42, fontWeight: '700' },
});
