
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const PACER_COLOR = '#61DAFB';

export type PacerBot = {
  id: string;
  name: string;
  tag: string;
  color: string;
  glyph: Glyph;
  focusTargetBase: number;
  resistTargetBase: number;
  restDayChance: number;
  seed: number;
};

export const PACER_BOTS: PacerBot[] = [
  {
    id: 'bot:pacer',
    name: 'Pacer',
    tag: 'pacer bot',
    color: '#61DAFB',
    glyph: 'robot',
    focusTargetBase: 85,
    resistTargetBase: 6,
    restDayChance: 0.12,
    seed: 0,
  },
  {
    id: 'bot:rival',
    name: 'Rival',
    tag: 'rival bot',
    color: '#ef6b8f',
    glyph: 'robot-angry',
    focusTargetBase: 110,
    resistTargetBase: 8,
    restDayChance: 0.05,
    seed: 4096,
  },
];

export type PacerWindow = 'today' | 'week' | 'all';

export type PacerStats = {
  focusMinutes: number;
  resists: number;
};

export type PacerRoomSession = {
  startedAt: string;
  expectedEndAt: string;
  targetMinutes: number;
  elapsedMin: number;
};

const WAKE_START_MIN = 7 * 60;
const WAKE_END_MIN = 23 * 60;
const ALL_TIME_DAYS = 30;

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function dayIndex(d: Date): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);
}

function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function isRestDay(bot: PacerBot, dayIdx: number): boolean {
  return rand(bot.seed + dayIdx * 7 + 1) < bot.restDayChance;
}

function focusTargetForDay(bot: PacerBot, dayIdx: number): number {
  if (isRestDay(bot, dayIdx)) return Math.round(bot.focusTargetBase * 0.18);
  return Math.round(bot.focusTargetBase * (0.7 + 0.6 * rand(bot.seed + dayIdx * 7 + 2)));
}

function resistTargetForDay(bot: PacerBot, dayIdx: number): number {
  if (isRestDay(bot, dayIdx)) return 1;
  return Math.max(
    1,
    Math.round(bot.resistTargetBase * (0.6 + 0.9 * rand(bot.seed + dayIdx * 7 + 3))),
  );
}

function dayProgress(d: Date): number {
  const m = minuteOfDay(d);
  if (m <= WAKE_START_MIN) return 0;
  if (m >= WAKE_END_MIN) return 1;
  const f = (m - WAKE_START_MIN) / (WAKE_END_MIN - WAKE_START_MIN);
  return f * f * (3 - 2 * f);
}

function completedDaysThisWeek(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function botStats(bot: PacerBot, window: PacerWindow, now: Date = new Date()): PacerStats {
  const today = dayIndex(now);
  const progress = dayProgress(now);
  let focusMinutes = Math.round(focusTargetForDay(bot, today) * progress);
  let resists = Math.floor(resistTargetForDay(bot, today) * progress);

  if (window !== 'today') {
    const back = window === 'week' ? completedDaysThisWeek(now) : ALL_TIME_DAYS;
    for (let i = 1; i <= back; i += 1) {
      const idx = today - i;
      focusMinutes += focusTargetForDay(bot, idx);
      resists += resistTargetForDay(bot, idx);
    }
  }

  return { focusMinutes, resists };
}

export function botRoomSession(bot: PacerBot, now: Date = new Date()): PacerRoomSession | null {
  const today = dayIndex(now);
  if (isRestDay(bot, today)) return null;

  const m = minuteOfDay(now);
  for (let i = 0; i < 3; i += 1) {
    const startMin = 8 * 60 + Math.floor(rand(bot.seed + today * 17 + i) * 12 * 60);
    const len = rand(bot.seed + today * 17 + i + 50) < 0.5 ? 25 : 50;
    if (m >= startMin && m < startMin + len) {
      const localMidnightMs =
        now.getTime() - m * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
      const startedAtMs = localMidnightMs + startMin * 60_000;
      return {
        startedAt: new Date(startedAtMs).toISOString(),
        expectedEndAt: new Date(startedAtMs + len * 60_000).toISOString(),
        targetMinutes: len,
        elapsedMin: m - startMin,
      };
    }
  }
  return null;
}
