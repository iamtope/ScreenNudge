import type { AttemptEvent } from '@/src/services/attempts';

// Estimated time saved, computed from DEDUPED resisted episodes — not raw
// attempts (which are noisy: a panic-tap burst would inflate the number).
//
//   savedEpisodes = same-app resist/open events clustered within 15 min
//   timeSaved     = savedEpisodes × DEFAULT_SESSION_MINUTES × REDUCTION_FACTOR
//
// An episode counts only if it contains a resist AND no "open anyway" (opening
// later compromises the episode → 0). Conservative + honest; labelled "Estimated".

export const EPISODE_GAP_MIN = 15;
export const DEFAULT_SESSION_MINUTES = 4;
/** Research-flavoured estimate of how much of a session is actually avoided. */
export const REDUCTION_FACTOR = 0.57;

export type TimeSaved = { episodes: number; minutes: number };

export function computeTimeSaved(events: AttemptEvent[]): TimeSaved {
  // Only decisions matter (resist / open-anyway); raw 'attempt' taps are ignored.
  const byApp = new Map<string, AttemptEvent[]>();
  for (const event of events) {
    if (event.outcome !== 'comeback' && event.outcome !== 'open') continue;
    const list = byApp.get(event.appName) ?? [];
    list.push(event);
    byApp.set(event.appName, list);
  }

  const gapMs = EPISODE_GAP_MIN * 60_000;
  let episodes = 0;

  for (const list of byApp.values()) {
    list.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    let hasResist = false;
    let hasOpen = false;
    let prev = -Infinity;

    const flush = () => {
      if (hasResist && !hasOpen) episodes += 1;
      hasResist = false;
      hasOpen = false;
    };

    for (const event of list) {
      const t = new Date(event.occurredAt).getTime();
      if (t - prev > gapMs) flush(); // a >15-min gap starts a fresh episode
      if (event.outcome === 'comeback') hasResist = true;
      if (event.outcome === 'open') hasOpen = true;
      prev = t;
    }
    flush();
  }

  return {
    episodes,
    minutes: Math.round(episodes * DEFAULT_SESSION_MINUTES * REDUCTION_FACTOR),
  };
}

export function formatTimeSaved(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
