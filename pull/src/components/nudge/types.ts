import type { ProtectionMode } from '@/src/domain/onboarding';
import type { NudgeStepConfig } from '@/src/domain/nudge';

export type NudgeStepProps = {
  config: NudgeStepConfig;
  mode: ProtectionMode;
  appName: string;
  onComplete: () => void;
  onOpenAnyway: () => void | Promise<void>;
  onStayOff: () => void;
  opensOver: boolean;
  isOpening?: boolean;
  openError?: string | null;
};
