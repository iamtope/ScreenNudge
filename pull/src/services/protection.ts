import { AppState, type AppStateStatus } from 'react-native';

import type { ProtectionMode } from '@/src/domain/onboarding';
import { protectionModeName } from '@/src/domain/onboarding';
import { SCREEN_TIME_PROTECTION_ID } from '@/src/state/onboarding';
import type { ProtectionSnapshot } from '@/src/services/protectionStorage';
import { isScreenTimeAvailable } from '@/src/services/screenTime';
import { getLocalTodayStats } from '@/src/services/attempts';
import { readPullPlusFlag } from '@/src/lib/storage';
import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';

function snapshotGuardedCount(snapshot: ProtectionSnapshot): number {
  return snapshot.usingScreenTime ? snapshot.screenTimeAppCount : snapshot.selectedAppIds.length;
}

/** Native-side family activity selection id (persisted in app group). */
export const PULL_SELECTION_ID = 'pull-main';

/** Repeating daily monitor that blocks once the time limit is hit (philosophy B). */
const DAILY_ACTIVITY = 'pull-daily';
/** One-shot monitor that re-blocks after a temporary "open anyway" pass. */
const PASS_ACTIVITY = 'pull-pass';
/** One-shot monitor that auto-unblocks when a focus session reaches its target. */
const FOCUS_ACTIVITY = 'pull-focus';
/** Repeating nightly window that blocks guarded apps during sleep/wind-down (Pull+). */
const BEDTIME_ACTIVITY = 'pull-bedtime';

const USER_DEFAULTS_MODE_KEY = 'pull:protectionMode';
const USER_DEFAULTS_REBLOCK_KEY = 'pull:reblockAt';
/** Epoch ms a focus session is blocking until; lets the daily shield yield to focus. */
const USER_DEFAULTS_FOCUS_UNTIL_KEY = 'pull:focusUntil';

/** Apple requires DeviceActivity schedules to be at least ~15 minutes long. */
const MIN_SCHEDULE_MINUTES = 15;

type DeviceActivity = typeof import('react-native-device-activity');

let cached: DeviceActivity | null | undefined;

function mod(): DeviceActivity | null {
  if (cached !== undefined) {
    return cached;
  }
  if (!isScreenTimeAvailable()) {
    cached = null;
    return null;
  }
  try {
    cached = require('react-native-device-activity') as DeviceActivity;
  } catch {
    cached = null;
  }
  return cached;
}

function brassColor() {
  return { red: 201, green: 184, blue: 144, alpha: 1 };
}

function textColor() {
  return { red: 245, green: 245, blue: 247, alpha: 1 };
}

function mutedColor() {
  return { red: 139, green: 139, blue: 149, alpha: 1 };
}

/** Length of a temporary pass after "open anyway", by mode. Floored to Apple's 15-min minimum. */
export function passMinutesForMode(mode: ProtectionMode): number {
  switch (mode) {
    case 'gentle':
      return 30;
    case 'strong':
      return MIN_SCHEDULE_MINUTES;
    case 'balanced':
    default:
      return 20;
  }
}

function dailyLimitFromSnapshot(snapshot: ProtectionSnapshot): number {
  const fromScreenTime = snapshot.protections[SCREEN_TIME_PROTECTION_ID]?.dailyLimitMin;
  if (typeof fromScreenTime === 'number' && fromScreenTime > 0) {
    return fromScreenTime;
  }
  const first = Object.values(snapshot.protections)[0]?.dailyLimitMin;
  return typeof first === 'number' && first > 0 ? first : 30;
}

function nowComponents() {
  const d = new Date();
  return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

/**
 * DeviceActivity thresholds use DateComponents, which accept `second`. We track
 * limits in seconds so sub-minute limits (e.g. a 30s test limit) work.
 */
function secondsToThreshold(totalSeconds: number) {
  if (totalSeconds < 60) {
    return { second: totalSeconds };
  }
  const minute = Math.floor(totalSeconds / 60);
  const second = totalSeconds % 60;
  return second ? { minute, second } : { minute };
}

function plusMinutesComponents(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

function selectionToken(library: DeviceActivity): string | null {
  try {
    return library.getFamilyActivitySelectionId(PULL_SELECTION_ID) ?? null;
  } catch {
    return null;
  }
}

/** Deep link opened from the Screen Time shield (primary) or its fallback notification. */
export function interceptDeepLink(mode: ProtectionMode): string {
  return `pull://intercept/app?mode=${mode}`;
}

/** Deep link used when the user keeps the guarded app blocked from the shield. */
export function resistDeepLink(mode: ProtectionMode): string {
  return `pull://resist/app?mode=${mode}`;
}

/** Deep link back into the focus room from the focus-session shield. */
export function focusDeepLink(): string {
  return 'pull://focus';
}

/**
 * Shield → Pull handoff. Apple's `openApp` action is a no-op in extensions (library
 * issue #81). We use openUrlWithDispatch + an immediate local notification as backup.
 */
function shieldActions(mode: ProtectionMode) {
  const url = interceptDeepLink(mode);
  const resistUrl = resistDeepLink(mode);
  return {
    primary: {
      type: 'openUrlWithDispatch',
      url,
      behavior: 'close' as const,
      delay: 0.35,
      actions: [
        {
          type: 'sendNotification' as const,
          payload: {
            title: 'Continue in Pull',
            body: 'Tap to start your pause.',
            sound: 'default' as const,
            interruptionLevel: 'timeSensitive' as const,
            userInfo: { url },
          },
        },
      ],
    },
    secondary: {
      type: 'openUrlWithDispatch',
      url: resistUrl,
      behavior: 'close' as const,
      delay: 0.15,
      actions: [
        {
          type: 'sendNotification' as const,
          payload: {
            title: 'Resist recorded',
            body: 'Tap only if Pull did not open.',
            interruptionLevel: 'passive' as const,
            userInfo: { url: resistUrl },
          },
        },
      ],
    },
  };
}

function attemptsSuffix(attempts: number): string {
  if (attempts <= 0) {
    return '';
  }
  return ` · ${attempts} attempt${attempts === 1 ? '' : 's'} today`;
}

function writeShieldConfig(library: DeviceActivity, mode: ProtectionMode, attempts = 0) {
  const modeLabel = protectionModeName(mode);
  const config = {
    backgroundBlurStyle: 2 as const,
    title: 'Pull',
    titleColor: textColor(),
    subtitle: `${modeLabel} · Limit reached${attemptsSuffix(attempts)}. Continue in Pull or count this as a resist.`,
    subtitleColor: mutedColor(),
    primaryButtonLabel: 'Continue in Pull',
    primaryButtonLabelColor: { red: 12, green: 12, blue: 14, alpha: 1 },
    primaryButtonBackgroundColor: brassColor(),
    secondaryButtonLabel: 'Close',
    secondaryButtonLabelColor: mutedColor(),
  };
  const actions = shieldActions(mode) as unknown as Parameters<typeof library.updateShield>[1];
  // Keep the default shield in sync (fallback) AND register it by id so daily blocks
  // can re-assert it even after a Wind-Down block changed the active shield.
  library.updateShield(config, actions, 'pull-shield');
  library.updateShieldWithId(config, actions, DAILY_SHIELD_ID);
}

/**
 * Shield shown while a focus session is running. Unlike the daily-limit shield
 * there is no "open anyway" pass — the apps stay blocked until the session ends.
 */
function focusShieldActions() {
  const url = focusDeepLink();
  return {
    primary: {
      type: 'openUrlWithDispatch',
      url,
      behavior: 'close' as const,
      delay: 0.35,
      actions: [
        {
          type: 'sendNotification' as const,
          payload: {
            title: 'Back to Pull',
            body: 'You’re in a focus session.',
            sound: 'default' as const,
            interruptionLevel: 'timeSensitive' as const,
            userInfo: { url },
          },
        },
      ],
    },
    secondary: {
      type: 'dismiss' as const,
      behavior: 'close' as const,
    },
  };
}

function writeFocusShieldConfig(library: DeviceActivity, endsAtLabel: string, durationLabel: string) {
  library.updateShield(
    {
      backgroundBlurStyle: 2 as const,
      title: 'Pull · Focus',
      titleColor: textColor(),
      subtitle: `${durationLabel} focus session · apps unlock at ${endsAtLabel}.`,
      subtitleColor: mutedColor(),
      primaryButtonLabel: 'Back to Pull',
      primaryButtonLabelColor: { red: 12, green: 12, blue: 14, alpha: 1 },
      primaryButtonBackgroundColor: brassColor(),
      secondaryButtonLabel: 'Stay focused',
      secondaryButtonLabelColor: mutedColor(),
    },
    focusShieldActions() as unknown as Parameters<typeof library.updateShield>[1],
    'pull-shield',
  );
}

function clockLabel(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function syncScreenTimeSelectionCount(): number {
  const library = mod();
  if (!library) {
    return 0;
  }
  try {
    const meta = library.activitySelectionMetadata({
      activitySelectionId: PULL_SELECTION_ID,
    });
    return meta?.applicationCount ?? 0;
  } catch {
    return 0;
  }
}

export function hasPersistedScreenTimeSelection(): boolean {
  const library = mod();
  if (!library) {
    return false;
  }
  try {
    return !!library.getFamilyActivitySelectionId(PULL_SELECTION_ID);
  } catch {
    return false;
  }
}

/** The nudge mode the shield/intercept should currently use. */
export function getActiveMode(): ProtectionMode {
  const library = mod();
  if (!library) {
    return 'balanced';
  }
  try {
    const stored = library.userDefaultsGet<string>(USER_DEFAULTS_MODE_KEY);
    if (stored === 'gentle' || stored === 'balanced' || stored === 'strong') {
      return stored;
    }
  } catch {
    // fall through
  }
  return 'balanced';
}

/**
 * Limit-based protection (philosophy B):
 * apps stay usable until the daily time limit is reached, then a DeviceActivity
 * monitor blocks them and the Pull shield appears. Resets daily at midnight.
 */
export async function applyProtection(
  snapshot: ProtectionSnapshot,
): Promise<{ ok: boolean; message?: string }> {
  const library = mod();
  if (!snapshot.activated) {
    return { ok: false, message: 'Protection is not activated.' };
  }
  if (!snapshot.usingScreenTime) {
    return {
      ok: false,
      message: 'Screen Time selection is required on a real iPhone. Re-pick apps in Settings → Protected apps.',
    };
  }
  if (!library) {
    return {
      ok: false,
      message: 'Screen Time native module unavailable. Rebuild the iOS app with Family Controls enabled.',
    };
  }

  // Free tier guards at most FREE_GUARDED_APP_LIMIT apps. The native selection is
  // an opaque token we can't trim to 2, so a free user over the cap gets
  // protection PAUSED entirely (we never block >2) until they trim or upgrade.
  const guardedCount = snapshotGuardedCount(snapshot);
  const isPullPlus = await readPullPlusFlag();
  if (!isPullPlus && guardedCount > FREE_GUARDED_APP_LIMIT) {
    stopProtection();
    return {
      ok: false,
      message: `Pull Free guards ${FREE_GUARDED_APP_LIMIT} apps — you have ${guardedCount} selected. Trim to ${FREE_GUARDED_APP_LIMIT}, or upgrade to Pull+ for unlimited.`,
    };
  }

  const token = selectionToken(library);
  if (!token && snapshot.screenTimeAppCount < 1) {
    return {
      ok: false,
      message: 'No apps selected. Open Settings → Protected apps and choose apps again.',
    };
  }
  if (!token) {
    return {
      ok: false,
      message: 'Could not read your Screen Time selection. Re-pick apps in Settings → Protected apps.',
    };
  }

  const mode = snapshot.globalMode;
  const limitMin = dailyLimitFromSnapshot(snapshot);
  const limitSec = Math.max(5, Math.round(limitMin * 60));
  const warnSec = Math.max(1, Math.round(limitSec * 0.8));

  const { attempts } = await getLocalTodayStats();

  try {
    library.userDefaultsSet(USER_DEFAULTS_MODE_KEY, mode);
    library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);

    writeShieldConfig(library, mode, attempts);

    // What to do when thresholds fire / the day rolls over.
    library.configureActions({
      activityName: DAILY_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: 'limit_reached',
      actions: [
        { type: 'blockSelection', familyActivitySelectionId: PULL_SELECTION_ID, shieldId: DAILY_SHIELD_ID },
      ],
    });
    library.configureActions({
      activityName: DAILY_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: 'limit_warning',
      actions: [
        {
          type: 'sendNotification',
          payload: {
            title: 'Almost at your limit',
            body: `You're close to your daily limit on guarded apps. ${protectionModeName(mode)} mode kicks in soon.`,
          },
        },
      ],
    });
    library.configureActions({
      activityName: DAILY_ACTIVITY,
      callbackName: 'intervalDidStart',
      actions: [{ type: 'unblockSelection', familyActivitySelectionId: PULL_SELECTION_ID }],
    });

    // Start the repeating daily monitor with time thresholds.
    await library.startMonitoring(
      DAILY_ACTIVITY,
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      [
        {
          eventName: 'limit_warning',
          familyActivitySelection: token,
          threshold: secondsToThreshold(warnSec),
          includesPastActivity: true,
        },
        {
          eventName: 'limit_reached',
          familyActivitySelection: token,
          threshold: secondsToThreshold(limitSec),
          includesPastActivity: true,
        },
      ],
    );

    // Start the day usable. If today's usage already exceeds the limit,
    // includesPastActivity makes the threshold event re-fire and re-block shortly.
    library.unblockSelection({ activitySelectionId: PULL_SELECTION_ID });
    library.refreshManagedSettingsStore?.();

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not set up Screen Time monitoring.';
    return { ok: false, message };
  }
}

async function schedulePassReblock(library: DeviceActivity, minutes: number): Promise<void> {
  try {
    library.configureActions({
      activityName: PASS_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [
        { type: 'blockSelection', familyActivitySelectionId: PULL_SELECTION_ID, shieldId: DAILY_SHIELD_ID },
      ],
    });
    try {
      library.stopMonitoring([PASS_ACTIVITY]);
    } catch {
      // first run: nothing to stop
    }
    await library.startMonitoring(
      PASS_ACTIVITY,
      {
        intervalStart: nowComponents(),
        intervalEnd: plusMinutesComponents(minutes),
        repeats: false,
      },
      [],
    );
  } catch {
    // Best-effort; JS fallback still applies.
  }
}

/** Grant a temporary pass after the user completes the intercept flow. */
export async function grantTemporaryAccess(
  mode: ProtectionMode,
): Promise<{ minutes: number; granted: boolean }> {
  const library = mod();
  const minutes = passMinutesForMode(mode);
  if (!library) {
    return { minutes, granted: false };
  }
  // Critical path: lift the shield and FLUSH it to the OS immediately, before any
  // navigation or monitor scheduling. This must succeed on its own so the app
  // opens even if the auto-reblock scheduling below throws (e.g. a stop/start race
  // on PASS_ACTIVITY, or a window at Apple's ~15-min minimum). The JS fallback
  // (reblockIfScheduled on next foreground) re-blocks once the pass expires.
  try {
    // Suspend the daily-limit monitor for the pass: its threshold is already
    // reached, so left running it immediately re-blocks the app we just unblocked
    // (this is why "open anyway" appeared to do nothing). It's re-armed by
    // applyProtection on the next launch.
    try {
      library.stopMonitoring([DAILY_ACTIVITY]);
    } catch {
      // nothing to stop
    }
    library.unblockSelection({ activitySelectionId: PULL_SELECTION_ID });
    library.userDefaultsSet(USER_DEFAULTS_REBLOCK_KEY, Date.now() + minutes * 60_000);
    library.refreshManagedSettingsStore?.();
  } catch {
    return { minutes, granted: false };
  }

  // Best-effort native auto re-block at the end of the pass window. Failures here
  // never prevent the app from opening — the JS fallback covers reblocking.
  void schedulePassReblock(library, minutes);
  return { minutes, granted: true };
}

/**
 * Begin enforcing a focus session: block the protected apps immediately and arm a
 * one-shot monitor that auto-unblocks at the target end. Returns `enforced: false`
 * (the focus timer + shared room still work) when Screen Time can't act — Android,
 * Simulator, missing entitlement, or no apps selected.
 */
export async function startFocusEnforcement(
  targetMinutes: number,
): Promise<{ enforced: boolean }> {
  const library = mod();
  if (!library) {
    return { enforced: false };
  }
  const token = selectionToken(library);
  if (!token) {
    return { enforced: false };
  }

  try {
    // A leftover "open anyway" pass must not silently fight the focus block.
    library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);

    const endsAt = new Date(Date.now() + targetMinutes * 60_000);
    // Mark the block as focus-owned so the daily shield refresh yields to it.
    library.userDefaultsSet(USER_DEFAULTS_FOCUS_UNTIL_KEY, endsAt.getTime());
    writeFocusShieldConfig(library, clockLabel(endsAt), durationLabel(targetMinutes));

    library.blockSelection({ activitySelectionId: PULL_SELECTION_ID });
    library.refreshManagedSettingsStore?.();

    // DeviceActivity schedules must be >= 15 min. Shorter sessions (or the tail of
    // a restored session) rely on the JS reconcile on next foreground to unblock.
    if (targetMinutes >= MIN_SCHEDULE_MINUTES) {
      library.configureActions({
        activityName: FOCUS_ACTIVITY,
        callbackName: 'intervalDidEnd',
        actions: [{ type: 'unblockSelection', familyActivitySelectionId: PULL_SELECTION_ID }],
      });
      try {
        library.stopMonitoring([FOCUS_ACTIVITY]);
      } catch {
        // first run: nothing to stop
      }
      await library.startMonitoring(
        FOCUS_ACTIVITY,
        {
          intervalStart: nowComponents(),
          intervalEnd: plusMinutesComponents(targetMinutes),
          repeats: false,
        },
        [],
      );
    }
    return { enforced: true };
  } catch {
    return { enforced: false };
  }
}

/**
 * End focus enforcement and restore normal protection. Always reuses
 * `applyProtection` (never `stopProtection`, which would tear down the daily
 * monitor) so apps the daily limit should block get re-blocked and the rest stay
 * open. Loads the snapshot itself so callers stay decoupled from onboarding state.
 */
export async function endFocusEnforcement(): Promise<void> {
  const library = mod();
  if (library) {
    try {
      library.stopMonitoring([FOCUS_ACTIVITY]);
      library.userDefaultsRemove(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    } catch {
      // Best-effort
    }
  }

  const { loadProtectionSnapshot } = await import('@/src/services/protectionStorage');
  const snapshot = await loadProtectionSnapshot();

  if (snapshot?.activated && snapshot.usingScreenTime) {
    await applyProtection(snapshot);
    return;
  }

  // No daily protection to restore — just lift the focus block.
  if (library) {
    try {
      library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
      library.unblockSelection({ activitySelectionId: PULL_SELECTION_ID });
      library.refreshManagedSettingsStore?.();
    } catch {
      // Best-effort
    }
  }
}

function minutesToTimeComponents(min: number) {
  const total = ((Math.round(min) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60, second: 0 };
}

function withinBedtimeWindow(startMin: number, endMin: number): boolean {
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  return startMin <= endMin ? now >= startMin && now < endMin : now >= startMin || now < endMin;
}

/** Named shields so daily-limit and Wind-Down blocks each show their own overlay,
 *  regardless of which fired last (the active shield is otherwise shared). */
const DAILY_SHIELD_ID = 'daily';
const BEDTIME_SHIELD_ID = 'bedtime';

function minutesClockLabel(totalMin: number): string {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

/**
 * Wind-Down shield: firm and unmistakable. Unlike the daily-limit shield it offers
 * NO "Continue in Pull" / open-anyway bypass — just Close. Registered as a named
 * shield so the bedtime block can activate it (via shieldId) even when JS is asleep.
 */
function writeBedtimeShieldConfig(library: DeviceActivity, wakeLabel: string) {
  library.updateShieldWithId(
    {
      backgroundBlurStyle: 2 as const,
      title: 'Wind-Down',
      titleColor: textColor(),
      subtitle: `Guarded apps are resting until ${wakeLabel}. Put the phone down and get some sleep.`,
      subtitleColor: mutedColor(),
      primaryButtonLabel: 'Close',
      primaryButtonLabelColor: textColor(),
      primaryButtonBackgroundColor: { red: 40, green: 40, blue: 56, alpha: 1 },
    },
    { primary: { type: 'dismiss', behavior: 'close' } } as unknown as Parameters<
      typeof library.updateShieldWithId
    >[1],
    BEDTIME_SHIELD_ID,
  );
}

/**
 * Wind-Down (Pull+): a repeating nightly window that blocks the guarded apps
 * during sleep hours. Blocks on intervalDidStart, lifts on intervalDidEnd; when
 * it lifts, the daily monitor's includesPastActivity re-asserts a block if the
 * user is still over their daily limit. Clears / no-ops when disabled, when
 * protection isn't set up, or when Screen Time is unavailable (dev/Android/sim).
 */
export async function applyBedtimeSchedule(
  snapshot: ProtectionSnapshot,
): Promise<{ ok: boolean; message?: string }> {
  const library = mod();
  if (!library) {
    return { ok: false, message: 'Screen Time native module unavailable.' };
  }

  const clear = () => {
    try {
      library.stopMonitoring([BEDTIME_ACTIVITY]);
    } catch {
      // first run: nothing to stop
    }
  };

  if (!snapshot.activated || !snapshot.usingScreenTime || !snapshot.bedtimeEnabled) {
    clear();
    return { ok: true };
  }
  const token = selectionToken(library);
  if (!token) {
    clear();
    return { ok: false, message: 'No Screen Time selection.' };
  }

  try {
    // Register the firm Wind-Down shield; the block actions below activate it by id
    // (so the right shield shows even when the block fires natively overnight).
    writeBedtimeShieldConfig(library, minutesClockLabel(snapshot.bedtimeEnd));

    library.configureActions({
      activityName: BEDTIME_ACTIVITY,
      callbackName: 'intervalDidStart',
      actions: [
        { type: 'blockSelection', familyActivitySelectionId: PULL_SELECTION_ID, shieldId: BEDTIME_SHIELD_ID },
      ],
    });
    library.configureActions({
      activityName: BEDTIME_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [{ type: 'unblockSelection', familyActivitySelectionId: PULL_SELECTION_ID }],
    });
    clear();
    await library.startMonitoring(
      BEDTIME_ACTIVITY,
      {
        intervalStart: minutesToTimeComponents(snapshot.bedtimeStart),
        intervalEnd: minutesToTimeComponents(snapshot.bedtimeEnd),
        repeats: true,
      },
      [],
    );
    // If we're already inside tonight's window, block now with the Wind-Down shield.
    if (withinBedtimeWindow(snapshot.bedtimeStart, snapshot.bedtimeEnd)) {
      library.useShieldWithId(BEDTIME_SHIELD_ID);
      library.blockSelection({ activitySelectionId: PULL_SELECTION_ID });
    }
    library.refreshManagedSettingsStore?.();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not set the bedtime schedule.';
    return { ok: false, message };
  }
}

export function reblockIfScheduled(snapshot: ProtectionSnapshot | null): void {
  if (!snapshot?.activated || !snapshot.usingScreenTime) {
    return;
  }
  const library = mod();
  if (!library) {
    return;
  }
  try {
    const reblockAt = library.userDefaultsGet<number>(USER_DEFAULTS_REBLOCK_KEY);
    if (!reblockAt || Date.now() < reblockAt) {
      return;
    }
    library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
    // Re-assert the daily shield (a Wind-Down block may have left it active).
    library.useShieldWithId(DAILY_SHIELD_ID);
    library.blockSelection({ activitySelectionId: PULL_SELECTION_ID });
    library.refreshManagedSettingsStore?.();
  } catch {
    // Best-effort
  }
}

/**
 * Rewrite the daily-limit shield with the current attempt count so the blocked-app
 * screen reflects today's tally. Yields while a focus session owns the shield, and
 * no-ops when Screen Time is unavailable. Safe to call on every foreground.
 */
export async function refreshDailyShield(snapshot: ProtectionSnapshot | null): Promise<void> {
  if (!snapshot?.activated || !snapshot.usingScreenTime) {
    return;
  }
  const library = mod();
  if (!library) {
    return;
  }
  try {
    const focusUntil = library.userDefaultsGet<number>(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    if (focusUntil && Date.now() < focusUntil) {
      return; // Focus session owns the shield right now.
    }
    if (
      snapshot.bedtimeEnabled &&
      withinBedtimeWindow(snapshot.bedtimeStart, snapshot.bedtimeEnd)
    ) {
      return; // Wind-Down owns the shield during its window.
    }
    const { attempts } = await getLocalTodayStats();
    writeShieldConfig(library, getActiveMode(), attempts);
  } catch {
    // Best-effort
  }
}

export function stopProtection(): void {
  const library = mod();
  if (!library) {
    return;
  }
  try {
    library.stopMonitoring([DAILY_ACTIVITY, PASS_ACTIVITY, BEDTIME_ACTIVITY]);
    library.resetBlocks('pull-stop');
    library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_MODE_KEY);
    library.refreshManagedSettingsStore?.();
  } catch {
    // Best-effort
  }
}

/**
 * Wipe ALL device-local Screen Time state: stops monitors, clears blocks/shields,
 * and removes the persisted Family Activity selection. Screen Time state is
 * device-global (not per-account), so this must run on sign-out / account deletion
 * — otherwise the next user (or a guest) inherits the previous user's guarded apps.
 */
export function clearProtectionState(): void {
  stopProtection();
  const library = mod();
  if (!library) {
    return;
  }
  try {
    library.userDefaultsRemove(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    // Empty the persisted selection so syncScreenTimeSelectionCount() returns 0 and
    // it doesn't repopulate the guarded-app count on next launch.
    library.setFamilyActivitySelectionId({ id: PULL_SELECTION_ID, familyActivitySelection: '' });
    library.clearAllManagedSettingsStoreSettings?.();
    library.refreshManagedSettingsStore?.();
  } catch {
    // Best-effort
  }
}

let appStateSubscription: { remove: () => void } | null = null;

export function startProtectionReblockListener(
  getSnapshot: () => ProtectionSnapshot | null,
): () => void {
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  const onChange = (state: AppStateStatus) => {
    if (state === 'active') {
      reblockIfScheduled(getSnapshot());
      void refreshDailyShield(getSnapshot());
    }
  };

  appStateSubscription = AppState.addEventListener('change', onChange);
  reblockIfScheduled(getSnapshot());
  void refreshDailyShield(getSnapshot());

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
  };
}
