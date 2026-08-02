import { Platform } from 'react-native';

type HapticsModule = typeof import('expo-haptics');

let cached: HapticsModule | null | undefined;

function mod(): HapticsModule | null {
  if (cached !== undefined) {
    return cached;
  }
  if (Platform.OS === 'web') {
    cached = null;
    return null;
  }
  try {
    cached = require('expo-haptics') as HapticsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

export function impact(style: ImpactStyle = 'medium'): void {
  const h = mod();
  if (!h) {
    return;
  }
  const styles = {
    light: h.ImpactFeedbackStyle.Light,
    medium: h.ImpactFeedbackStyle.Medium,
    heavy: h.ImpactFeedbackStyle.Heavy,
    soft: h.ImpactFeedbackStyle.Soft,
    rigid: h.ImpactFeedbackStyle.Rigid,
  };
  void h.impactAsync(styles[style]).catch(() => {});
}

export function selection(): void {
  const h = mod();
  if (!h) {
    return;
  }
  void h.selectionAsync().catch(() => {});
}

export function success(): void {
  const h = mod();
  if (!h) {
    return;
  }
  void h.notificationAsync(h.NotificationFeedbackType.Success).catch(() => {});
}

export function celebrate(): void {
  if (!mod()) {
    return;
  }
  selection();
  setTimeout(() => impact('light'), 90);
  setTimeout(() => impact('medium'), 210);
  setTimeout(() => success(), 340);
  setTimeout(() => impact('heavy'), 380);
}
