
export type Question = {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
};

export const personalizationQuestions: Question[] = [
  {
    id: 'frequency',
    prompt: 'How often do you find yourself doomscrolling?',
    options: [
      { id: 'rarely', label: 'Rarely' },
      { id: 'once-a-day', label: 'Once a day' },
      { id: 'several-times', label: 'Several times a day' },
      { id: 'too-often', label: 'Too often to count' },
    ],
  },
  {
    id: 'timing',
    prompt: 'When do you find yourself scrolling the most?',
    options: [
      { id: 'waking', label: 'Right after waking up' },
      { id: 'work', label: 'During work / study' },
      { id: 'late-night', label: 'Late at night' },
      { id: 'random', label: 'Randomly throughout the day' },
    ],
  },
  {
    id: 'trigger',
    prompt: 'Most of the time, what are you looking for?',
    options: [
      { id: 'entertainment', label: 'Entertainment' },
      { id: 'escape-stress', label: 'Escape stress' },
      { id: 'unsure', label: "I don't know" },
    ],
  },
  {
    id: 'support',
    prompt: "Who motivates you to stick to your goals?",
    options: [
      { id: 'close-friends', label: 'Close friends' },
      { id: 'family', label: 'Family' },
      { id: 'coworkers', label: 'Coworkers' },
      { id: 'nobody', label: 'Nobody right now' },
    ],
  },
];

export type ProtectionMode = 'gentle' | 'balanced' | 'strong';

export type ProtectionModeInfo = {
  id: ProtectionMode;
  name: string;
  tagline: string;
  includes: string[];
  bestFor: string[];
  recommended?: boolean;
};

export const protectionModes: ProtectionModeInfo[] = [
  {
    id: 'gentle',
    name: 'Gentle',
    tagline: 'Light nudges that stay out of your way.',
    includes: ['Breathing pause', 'Intention check', 'Open anyway allowed', 'Attempt counted'],
    bestFor: ['Beginners', 'Low-frequency users', 'No strict blocking'],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    tagline: 'Real friction with a way back. Recommended.',
    includes: [
      'Breathing pause',
      'Intention check',
      'Friend nudge option',
      'Simple challenge',
      'Delay timer',
      'Open anyway behind friction',
    ],
    bestFor: ['Most users', 'Social accountability', 'Balanced friction'],
    recommended: true,
  },
  {
    id: 'strong',
    name: 'Strong',
    tagline: 'Stronger intervention when you need it.',
    includes: [
      'Math problem',
      'Word guess',
      'Step counter',
      'Longer delay',
      'No instant open',
    ],
    bestFor: ['Late-night scrolling', 'Repeated attempts', 'Stricter protection'],
  },
];

export function protectionModeName(mode: ProtectionMode): string {
  return protectionModes.find((m) => m.id === mode)?.name ?? 'Balanced';
}

export const dailyLimitOptions: number[] = [0.5, 10, 15, 20, 30, 45, 60, 90, 120];

export const DEFAULT_DAILY_LIMIT_MIN = 30;
export const REPEAT_UNLOCK_FRICTION_THRESHOLD = 8;
export const DEFAULT_DAILY_OPENS = REPEAT_UNLOCK_FRICTION_THRESHOLD;
export const DEFAULT_PROTECTION_MODE: ProtectionMode = 'balanced';

export function formatMinutes(min: number): string {
  if (min < 1) {
    return `${Math.round(min * 60)} sec`;
  }
  if (min >= 60) {
    const hours = Math.floor(min / 60);
    const rest = Math.round(min % 60);
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${Math.round(min)} min`;
}

export function softWarningMinutes(dailyLimitMin: number): number {
  return dailyLimitMin * 0.8;
}
