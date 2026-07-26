import type { ProtectionMode } from '@/src/domain/onboarding';

/**
 * Bridges a cold-start deep link (Screen Time shield / notification) to the first
 * navigation decision. On launch the deep-link handler resolves any initial URL and
 * stores the target here; the landing screen waits for that resolution before it
 * redirects, so the shield's "Continue in Pull" reliably lands on the challenge flow
 * instead of being clobbered by the default home redirect.
 */
export type PendingNav =
  | { kind: 'intercept'; app: string; mode?: ProtectionMode }
  | { kind: 'resist'; app: string; mode?: ProtectionMode }
  | { kind: 'focus' };

let pending: PendingNav | null = null;
let settled = false;
let resolveReady: (() => void) | null = null;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function setPendingNav(nav: PendingNav): void {
  pending = nav;
}

/** Returns and clears the pending target (consume once). */
export function takePendingNav(): PendingNav | null {
  const value = pending;
  pending = null;
  return value;
}

/** Called by the deep-link handler once initial URLs/notifications are checked. */
export function markInitialDeepLinkChecked(): void {
  if (!settled) {
    settled = true;
    resolveReady?.();
  }
}

/** Resolves once the initial deep-link check has completed (or immediately after). */
export function whenInitialDeepLinkChecked(): Promise<void> {
  return ready;
}
