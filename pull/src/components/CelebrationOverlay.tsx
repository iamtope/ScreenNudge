import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import type { Celebration } from '@/src/domain/achievements';
import * as Haptics from '@/src/lib/haptics';
import { palette } from '@/src/theme/palette';

export function CelebrationOverlay({
  achievement,
  onDone,
  eyebrow = 'Achievement unlocked',
}: {
  achievement: Celebration | null;
  onDone: () => void;
  eyebrow?: string;
}) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.6);

  const dismiss = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.85, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
  }, [onDone, progress, scale]);

  useEffect(() => {
    if (!achievement) {
      return;
    }
    progress.value = 0;
    scale.value = 0.6;
    progress.value = withTiming(1, { duration: 220 });
    scale.value = withSpring(1, { damping: 9, stiffness: 150, mass: 0.6 });
    Haptics.celebrate();
    const timer = setTimeout(dismiss, 2800);
    return () => clearTimeout(timer);
  }, [achievement?.id]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: scale.value }],
  }));

  if (!achievement) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="auto">
      <Pressable style={styles.fill} onPress={dismiss}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <MaterialCommunityIcons
            name={achievement.icon}
            size={60}
            color={palette.brass}
            style={styles.icon}
          />
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.desc}>{achievement.description}</Text>
          <Text style={styles.tap}>tap to dismiss</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,5,9,0.8)' },
  card: {
    width: 280,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.surface,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: { color: palette.brass, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  icon: { marginVertical: 8 },
  title: { color: palette.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  desc: { color: palette.textSoft, fontSize: 15, textAlign: 'center' },
  tap: { color: palette.textMute, fontSize: 12, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
});
