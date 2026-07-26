import type { ProtectionMode } from '@/src/domain/onboarding';

/**
 * Agnostic, composable nudge steps. Each kind maps to a standalone component
 * (see src/components/nudge/*). A flow is just an ordered list of step configs,
 * so any step can be reused individually or recomposed per mode in the future.
 */
export type NudgeStepKind =
  | 'breathe'
  | 'intention'
  | 'simpleChallenge'
  | 'mathChallenge'
  | 'wordChallenge'
  | 'stepCounter'
  | 'delay'
  | 'decision';

export type NudgeStepConfig =
  | { kind: 'breathe'; seconds: number }
  | { kind: 'intention' }
  | { kind: 'simpleChallenge'; phrase: string }
  | { kind: 'mathChallenge'; difficulty: 'easy' | 'medium' | 'hard' }
  | { kind: 'wordChallenge' }
  | { kind: 'stepCounter'; steps: number }
  | { kind: 'delay'; seconds: number; label?: string }
  | { kind: 'decision'; allowInstantOpen: boolean };

export type NudgeFlow = {
  mode: ProtectionMode;
  steps: NudgeStepConfig[];
};

export const intentionOptions = [
  'Reply to someone',
  'Post something',
  'Take a break',
  "I don't know",
] as const;

/**
 * Build a flow for a mode. Each open shows exactly ONE friction step (rotating by
 * `attempt` so it varies — sometimes a breath, sometimes a challenge, sometimes a
 * wait), then the open/stay-off decision. The mode sets which pool that single
 * step is drawn from (harder for strong). `opensOver` adds one extra step once the
 * user has exceeded their configured opens/day (Apple can't enforce opens
 * natively, so we add friction here instead).
 */
export function getNudgeFlow(mode: ProtectionMode, opensOver = false, attempt = 1): NudgeFlow {
  // Pick one item from a pool, rotating by attempt number (1-indexed).
  const pick = (pool: NudgeStepConfig[]): NudgeStepConfig =>
    pool[(Math.max(attempt, 1) - 1) % pool.length];

  if (mode === 'gentle') {
    const step = pick([
      { kind: 'breathe', seconds: 4 },
      { kind: 'intention' },
    ]);
    const steps: NudgeStepConfig[] = [step];
    if (opensOver) {
      steps.push({ kind: 'simpleChallenge', phrase: 'I choose this on purpose' });
    }
    steps.push({ kind: 'decision', allowInstantOpen: !opensOver });
    return { mode, steps };
  }

  if (mode === 'strong') {
    const step = pick([
      { kind: 'mathChallenge', difficulty: opensOver ? 'hard' : 'medium' },
      { kind: 'wordChallenge' },
      { kind: 'stepCounter', steps: opensOver ? 40 : 25 },
      { kind: 'delay', seconds: opensOver ? 30 : 20, label: 'Longer delay' },
    ]);
    const steps: NudgeStepConfig[] = [step];
    if (opensOver) {
      steps.push({ kind: 'simpleChallenge', phrase: 'I really mean to open this' });
    }
    steps.push({ kind: 'decision', allowInstantOpen: false });
    return { mode, steps };
  }

  // balanced — one rotating friction step, then the choice.
  const step = pick([
    { kind: 'breathe', seconds: 5 },
    { kind: 'intention' },
    { kind: 'simpleChallenge', phrase: 'I understand this counts as an attempt' },
    { kind: 'mathChallenge', difficulty: 'easy' },
    { kind: 'wordChallenge' },
    { kind: 'delay', seconds: 8, label: 'Quick pause' },
  ]);
  const steps: NudgeStepConfig[] = [step];
  if (opensOver) {
    steps.push({ kind: 'delay', seconds: 12 });
  }
  steps.push({ kind: 'decision', allowInstantOpen: false });
  return { mode, steps };
}

/** Human label for a step, used for progress headers. */
export function stepTitle(kind: NudgeStepKind): string {
  switch (kind) {
    case 'breathe':
      return 'Breathe';
    case 'intention':
      return 'Intention';
    case 'simpleChallenge':
      return 'Confirm';
    case 'mathChallenge':
      return 'Solve';
    case 'wordChallenge':
      return 'Unscramble';
    case 'stepCounter':
      return 'Move';
    case 'delay':
      return 'Wait';
    case 'decision':
      return 'Decision';
    default:
      return '';
  }
}
