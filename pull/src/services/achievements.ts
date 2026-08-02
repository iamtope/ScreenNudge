import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementMetrics,
} from '@/src/domain/achievements';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { withTimeoutFallback } from '@/src/lib/network';

const UNLOCKED_KEY = 'pull:achievements:v1';
const SEED_KEY = 'pull:achievements:seeded:v1';
const SERVER_UNLOCKS_WAIT_MS = 2_000;

export type UnlockedMap = Record<string, string>;

type AchievementUnlockRow = {
  achievement_id: string;
  unlocked_at: string;
};

async function readLocalUnlocked(): Promise<UnlockedMap> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKED_KEY);
    return raw ? (JSON.parse(raw) as UnlockedMap) : {};
  } catch {
    return {};
  }
}

async function writeLocalUnlocked(unlocked: UnlockedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked));
  } catch {
  }
}

async function readServerUnlocked(): Promise<UnlockedMap> {
  if (!isSupabaseConfigured) {
    return {};
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return {};
    }
    const { data, error } = await supabase.rpc('get_my_achievement_unlocks');
    if (error || !data) {
      return {};
    }
    return (data as AchievementUnlockRow[]).reduce<UnlockedMap>((acc, row) => {
      if (row.achievement_id && row.unlocked_at) {
        acc[row.achievement_id] = row.unlocked_at;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function writeServerUnlocked(unlocked: UnlockedMap): Promise<void> {
  const ids = Object.keys(unlocked);
  if (!ids.length || !isSupabaseConfigured) {
    return;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return;
    }
    await supabase.rpc('record_achievement_unlocks', {
      p_achievement_ids: ids,
    });
  } catch {
  }
}

function mergeUnlocked(local: UnlockedMap, server: UnlockedMap): UnlockedMap {
  return { ...server, ...local };
}

export async function getUnlocked(): Promise<UnlockedMap> {
  const [local, server] = await Promise.all([
    readLocalUnlocked(),
    withTimeoutFallback(readServerUnlocked(), SERVER_UNLOCKS_WAIT_MS, {}),
  ]);
  const merged = mergeUnlocked(local, server);
  if (Object.keys(server).length) {
    await writeLocalUnlocked(merged);
  }
  if (Object.keys(local).length) {
    void writeServerUnlocked(local);
  }
  return merged;
}

export function findNewlyUnlocked(metrics: AchievementMetrics, unlocked: UnlockedMap): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && (metrics[a.metric] ?? 0) >= a.threshold);
}

export async function markUnlocked(ids: string[]): Promise<UnlockedMap> {
  const current = await getUnlocked();
  const now = new Date().toISOString();
  let changed = false;
  for (const id of ids) {
    if (!current[id]) {
      current[id] = now;
      changed = true;
    }
  }
  if (changed) {
    await writeLocalUnlocked(current);
    void writeServerUnlocked(current);
  }
  return current;
}

export async function isSeeded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setSeeded(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEED_KEY, '1');
  } catch {
  }
}
