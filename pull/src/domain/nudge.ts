import type { ProtectionMode } from '@/src/domain/onboarding';

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

export function getNudgeFlow(mode: ProtectionMode, opensOver = false, attempt = 1): NudgeFlow {
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
