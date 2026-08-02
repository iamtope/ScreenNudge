import React from 'react';

import type { NudgeStepKind } from '@/src/domain/nudge';
import { BreatheStep } from './BreatheStep';
import { IntentionStep } from './IntentionStep';
import { SimpleChallengeStep } from './SimpleChallengeStep';
import { MathChallengeStep } from './MathChallengeStep';
import { WordChallengeStep } from './WordChallengeStep';
import { StepCounterStep } from './StepCounterStep';
import { DelayStep } from './DelayStep';
import { DecisionStep } from './DecisionStep';
import type { NudgeStepProps } from './types';

export const nudgeStepRegistry: Record<NudgeStepKind, React.ComponentType<NudgeStepProps>> = {
  breathe: BreatheStep,
  intention: IntentionStep,
  simpleChallenge: SimpleChallengeStep,
  mathChallenge: MathChallengeStep,
  wordChallenge: WordChallengeStep,
  stepCounter: StepCounterStep,
  delay: DelayStep,
  decision: DecisionStep,
};

export type { NudgeStepProps } from './types';
