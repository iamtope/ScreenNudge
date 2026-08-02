import type { ProtectionMode } from '@/src/domain/onboarding';

export type PendingNav =
  | { kind: 'intercept'; app: string; mode?: ProtectionMode }
  | { kind: 'resist'; app: string; mode?: ProtectionMode }
  | { kind: 'focus' }
  | { kind: 'invite'; code: string };

let pending: PendingNav | null = null;
let settled = false;
let resolveReady: (() => void) | null = null;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function setPendingNav(nav: PendingNav): void {
  pending = nav;
}

export function takePendingNav(): PendingNav | null {
  const value = pending;
  pending = null;
  return value;
}

export function markInitialDeepLinkChecked(): void {
  if (!settled) {
    settled = true;
    resolveReady?.();
  }
}

export function whenInitialDeepLinkChecked(): Promise<void> {
  return ready;
}
