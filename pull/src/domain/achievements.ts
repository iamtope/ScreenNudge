// Micro-achievements: thresholds on metrics the app already tracks. Each unlock
// fires a tactile celebration; the profile shelf shows earned + locked-glowing.

import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** A MaterialCommunityIcons glyph name (type-checked against the real set). */
export type AchievementIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type AchievementMetric = 'resists' | 'streak' | 'focusMinutes' | 'focusSessions';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  metric: AchievementMetric;
  threshold: number;
};

export type AchievementMetrics = Record<AchievementMetric, number>;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'comeback_first', title: 'First resist', description: 'You resisted the urge once.', icon: 'hook', metric: 'resists', threshold: 1 },
  { id: 'comeback_10', title: 'Ten resists', description: 'Stayed blocked 10 times.', icon: 'arm-flex', metric: 'resists', threshold: 10 },
  { id: 'comeback_50', title: 'Unscrollable', description: '50 resists — the feed lost.', icon: 'shield-check', metric: 'resists', threshold: 50 },
  { id: 'streak_3', title: 'Warming up', description: '3-day resist streak.', icon: 'fire', metric: 'streak', threshold: 3 },
  { id: 'streak_7', title: 'Week strong', description: '7 days in a row.', icon: 'lightning-bolt', metric: 'streak', threshold: 7 },
  { id: 'streak_30', title: 'Iron month', description: '30-day streak.', icon: 'trophy', metric: 'streak', threshold: 30 },
  { id: 'focus_first', title: 'First focus', description: 'Completed your first session.', icon: 'target', metric: 'focusSessions', threshold: 1 },
  { id: 'focus_5h', title: 'Five hours deep', description: '5 hours focused.', icon: 'timer-sand', metric: 'focusMinutes', threshold: 300 },
  { id: 'focus_25h', title: 'Deep worker', description: '25 hours focused.', icon: 'brain', metric: 'focusMinutes', threshold: 1500 },
];

export const EMPTY_METRICS: AchievementMetrics = {
  resists: 0,
  streak: 0,
  focusMinutes: 0,
  focusSessions: 0,
};
