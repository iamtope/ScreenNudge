import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, type ViewStyle } from 'react-native';

export type ScreenTimeReportProps = {
  /** Inclusive local day bounds, "YYYY-MM-DD". */
  startDay: string;
  endDay: string;
  style?: ViewStyle;
};

type NativeProps = { range: string[]; style?: ViewStyle };

/**
 * Renders Apple's Screen Time data through our DeviceActivityReport extension.
 *
 * Any range works — DeviceActivityFilter takes an arbitrary DateInterval — though how
 * far back data actually exists is bounded by what Screen Time retains on the device.
 *
 * The whole view is drawn out-of-process by `targets/ScreenTimeReport`, so none of the
 * numbers are readable from JS: this cannot feed charts, the leaderboard or Supabase.
 */
const NativeView: React.ComponentType<NativeProps> | null =
  Platform.OS === 'ios' ? requireNativeViewManager('ScreenTimeReport') : null;

export function ScreenTimeReport({ startDay, endDay, style }: ScreenTimeReportProps) {
  if (!NativeView) {
    return null;
  }
  return <NativeView range={[startDay, endDay]} style={style} />;
}

export const isScreenTimeReportAvailable = Platform.OS === 'ios';

export function screenTimeDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}
