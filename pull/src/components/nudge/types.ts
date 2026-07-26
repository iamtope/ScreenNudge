import type { ProtectionMode } from '@/src/domain/onboarding';
import type { NudgeStepConfig } from '@/src/domain/nudge';

/**
 * Every nudge step component receives the same props so steps stay agnostic and
 * individually reusable. A step calls `onComplete` when its requirement is met.
 * The `decision` step additionally uses the action callbacks.
 */
export type NudgeStepProps = {
  config: NudgeStepConfig;
  mode: ProtectionMode;
  appName: string;
  /** Advance to the next step (or finish, for decision). */
  onComplete: () => void;
  /** User chose to open the app anyway (decision step). */
  onOpenAnyway: () => void | Promise<void>;
  /** User chose to stay off / cancel. */
  onStayOff: () => void;
  /** Whether the user is past their configured opens/day budget. */
  opensOver: boolean;
  /** Whether Pull is currently granting the temporary Screen Time pass. */
  isOpening?: boolean;
  /** Error from the last temporary pass attempt. */
  openError?: string | null;
};
