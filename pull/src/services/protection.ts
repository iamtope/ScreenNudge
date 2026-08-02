import { AppState, type AppStateStatus } from 'react-native';

import type { ProtectionMode } from '@/src/domain/onboarding';
import { protectionModeName } from '@/src/domain/onboarding';
import { SCREEN_TIME_PROTECTION_ID } from '@/src/state/onboarding';
import type { ProtectionSnapshot } from '@/src/services/protectionStorage';
import { isScreenTimeAvailable } from '@/src/services/screenTime';
import { getLocalTodayStats } from '@/src/services/attempts';
import { readPullPlusFlag } from '@/src/lib/storage';
import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { resolveGoalLock } from '@/src/services/goalLock';

function snapshotGuardedCount(snapshot: ProtectionSnapshot): number {
  return snapshot.usingScreenTime ? snapshot.screenTimeAppCount : snapshot.selectedAppIds.length;
}

export const PULL_SELECTION_ID = 'pull-main';

const DAILY_ACTIVITY = 'pull-daily';
const PASS_ACTIVITY = 'pull-pass';
const FOCUS_ACTIVITY = 'pull-focus';
const BEDTIME_ACTIVITY = 'pull-bedtime';

const USER_DEFAULTS_MODE_KEY = 'pull:protectionMode';
const USER_DEFAULTS_REBLOCK_KEY = 'pull:reblockAt';
const USER_DEFAULTS_DAILY_LIMIT_SECONDS_KEY = 'pull:dailyLimitSeconds';
const USER_DEFAULTS_FOCUS_UNTIL_KEY = 'pull:focusUntil';
const USER_DEFAULTS_PROTECTION_ENABLED_KEY = 'pull:protectionEnabled';
const USER_DEFAULTS_DAILY_REACHED_DAY_KEY = 'pull:dailyLimitReachedDay';
const USER_DEFAULTS_DAILY_MONITOR_SIGNATURE_KEY = 'pull:dailyMonitorSignature';
const USER_DEFAULTS_BEDTIME_ENABLED_KEY = 'pull:bedtimeEnabled';
const USER_DEFAULTS_BEDTIME_START_KEY = 'pull:bedtimeStart';
const USER_DEFAULTS_BEDTIME_END_KEY = 'pull:bedtimeEnd';
const DAILY_THRESHOLD_EVENT_KEY =
  'events_pull-daily_eventDidReachThreshold_limit_reached';

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

function secondsToThreshold(totalSeconds: number) {
  if (totalSeconds < 60) {
    return { second: totalSeconds };
  }
  const minute = Math.floor(totalSeconds / 60);
  const second = totalSeconds % 60;
  return second ? { minute, second } : { minute };
}

function configureDailyActions(
  library: DeviceActivity,
  blockNotBefore?: Date,
): void {
  library.configureActions({
    activityName: DAILY_ACTIVITY,
    callbackName: 'eventDidReachThreshold',
    eventName: 'limit_reached',
    actions: [
      {
        type: 'blockSelection',
        familyActivitySelectionId: PULL_SELECTION_ID,
        shieldId: DAILY_SHIELD_ID,
        ...(blockNotBefore ? { neverTriggerBefore: blockNotBefore } : {}),
      },
    ],
  });
  library.configureActions({
    activityName: DAILY_ACTIVITY,
    callbackName: 'eventDidReachThreshold',
    eventName: 'limit_warning',
    actions: [],
  });
  library.configureActions({
    activityName: DAILY_ACTIVITY,
    callbackName: 'intervalDidStart',
    actions: [],
  });
}

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function eventOccurredToday(timestamp: unknown): boolean {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return false;
  }
  return dateKey(new Date(timestamp)) === dateKey();
}

function dailyLimitReachedToday(library: DeviceActivity): boolean {
  const reachedDay = library.userDefaultsGet<string>(USER_DEFAULTS_DAILY_REACHED_DAY_KEY);
  if (reachedDay === dateKey()) {
    return true;
  }
  return eventOccurredToday(library.userDefaultsGet<number>(DAILY_THRESHOLD_EVENT_KEY));
}

function dailyMonitorSignature(token: string, limitSec: number, streakSec: number): string {
  return `${limitSec}:${streakSec}:${token}`;
}

let dailyMonitorUpdate: Promise<void> = Promise.resolve();

async function updateDailyMonitor(
  library: DeviceActivity,
  token: string,
  limitSec: number,
  streakSec: number,
): Promise<void> {
  const signature = dailyMonitorSignature(token, limitSec, streakSec);
  const storedSignature = library.userDefaultsGet<string>(
    USER_DEFAULTS_DAILY_MONITOR_SIGNATURE_KEY,
  );
  const active = library.getActivities().includes(DAILY_ACTIVITY);
  if (active && storedSignature === signature) {
    return;
  }
  if (active && !storedSignature) {
    library.userDefaultsSet(USER_DEFAULTS_DAILY_MONITOR_SIGNATURE_KEY, signature);
    return;
  }
  if (active) {
    library.stopMonitoring([DAILY_ACTIVITY]);
  }
  if (storedSignature && storedSignature !== signature) {
    library.userDefaultsRemove(USER_DEFAULTS_DAILY_REACHED_DAY_KEY);
    library.userDefaultsRemove(DAILY_THRESHOLD_EVENT_KEY);
  }
  await library.startMonitoring(
    DAILY_ACTIVITY,
    {
      intervalStart: { hour: 0, minute: 0, second: 0 },
      intervalEnd: { hour: 23, minute: 59, second: 59 },
      repeats: true,
    },
    [
      {
        eventName: 'limit_reached',
        familyActivitySelection: token,
        threshold: secondsToThreshold(limitSec),
        includesPastActivity: true,
      },
      // Always scheduled, even when it matches the blocking limit: this is the only
      // thing that writes the streak ledger, and it has to fire on a plain day too.
      // It never shields anything — configureDailyActions only wires limit_reached.
      {
        eventName: 'streak_goal',
        familyActivitySelection: token,
        threshold: secondsToThreshold(streakSec),
        includesPastActivity: true,
      },
    ],
  );
  library.userDefaultsSet(USER_DEFAULTS_DAILY_MONITOR_SIGNATURE_KEY, signature);
}

async function ensureDailyMonitor(
  library: DeviceActivity,
  token: string,
  limitSec: number,
  streakSec: number,
): Promise<void> {
  const next = dailyMonitorUpdate.then(
    () => updateDailyMonitor(library, token, limitSec, streakSec),
    () => updateDailyMonitor(library, token, limitSec, streakSec),
  );
  dailyMonitorUpdate = next.catch(() => {});
  return next;
}

export function disableDailyLimitWarning(): void {
  const library = mod();
  if (!library) {
    return;
  }
  try {
    library.configureActions({
      activityName: DAILY_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: 'limit_warning',
      actions: [],
    });
  } catch {
  }
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

export function getScreenTimeSelectionToken(): string | null {
  const library = mod();
  return library ? selectionToken(library) : null;
}

export function interceptDeepLink(mode: ProtectionMode): string {
  return `screennudge://intercept/app?mode=${mode}`;
}

export function resistDeepLink(mode: ProtectionMode): string {
  return `screennudge://resist/app?mode=${mode}`;
}

export function focusDeepLink(): string {
  return 'screennudge://focus';
}

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
            title: 'Continue in ScreenNudge',
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
            body: 'Tap only if ScreenNudge did not open.',
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
    title: 'ScreenNudge',
    titleColor: textColor(),
    subtitle: `${modeLabel} · Limit reached${attemptsSuffix(attempts)}. Continue in ScreenNudge.`,
    subtitleColor: mutedColor(),
    primaryButtonLabel: 'Continue in ScreenNudge',
    primaryButtonLabelColor: { red: 12, green: 12, blue: 14, alpha: 1 },
    primaryButtonBackgroundColor: brassColor(),
    secondaryButtonLabel: 'Close',
    secondaryButtonLabelColor: mutedColor(),
  };
  const actions = shieldActions(mode) as unknown as Parameters<typeof library.updateShield>[1];
  library.updateShield(config, actions, 'pull-shield');
  library.updateShieldWithId(config, actions, DAILY_SHIELD_ID);
}

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
            title: 'Back to ScreenNudge',
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
  const config = {
    backgroundBlurStyle: 2 as const,
    title: 'ScreenNudge · Focus',
    titleColor: textColor(),
    subtitle: `${durationLabel} focus session · apps unlock at ${endsAtLabel}.`,
    subtitleColor: mutedColor(),
    primaryButtonLabel: 'Back to ScreenNudge',
    primaryButtonLabelColor: { red: 12, green: 12, blue: 14, alpha: 1 },
    primaryButtonBackgroundColor: brassColor(),
    secondaryButtonLabel: 'Stay focused',
    secondaryButtonLabelColor: mutedColor(),
  };
  const actions = focusShieldActions() as unknown as Parameters<typeof library.updateShield>[1];
  library.updateShield(config, actions, 'pull-focus');
  library.updateShieldWithId(config, actions, FOCUS_SHIELD_ID);
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
  }
  return 'balanced';
}

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
      message: 'Choose apps in Settings → Protected apps, then try again.',
    };
  }
  if (!library) {
    return {
      ok: false,
      message: 'Screen Time is unavailable right now. Restart ScreenNudge and try again.',
    };
  }

  const guardedCount = snapshotGuardedCount(snapshot);
  const isPullPlus = await readPullPlusFlag();
  if (!isPullPlus && guardedCount > FREE_GUARDED_APP_LIMIT) {
    stopProtection();
    return {
      ok: false,
      message: `ScreenNudge Free guards ${FREE_GUARDED_APP_LIMIT} apps — you have ${guardedCount} selected. Trim to ${FREE_GUARDED_APP_LIMIT}, or upgrade to ScreenNudge+ for unlimited.`,
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
  // Blocking always follows the configured limit. Only the streak is judged against
  // the goal frozen at the start of the day, so a raise mid-evening cannot rescue it.
  const { goalMin } = await resolveGoalLock(limitMin);
  const streakSec = Math.max(5, Math.round(goalMin * 60));

  const { attempts } = await getLocalTodayStats();

  try {
    const reblockAt = library.userDefaultsGet<number>(USER_DEFAULTS_REBLOCK_KEY);
    const passEnd = reblockAt && reblockAt > Date.now() ? new Date(reblockAt) : undefined;

    writeNativeProtectionState(library, snapshot);
    library.userDefaultsSet(USER_DEFAULTS_MODE_KEY, mode);
    library.userDefaultsSet(USER_DEFAULTS_DAILY_LIMIT_SECONDS_KEY, limitSec);
    if (!passEnd) {
      library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
    }

    writeShieldConfig(library, mode, attempts);

    configureDailyActions(library, passEnd);

    await ensureDailyMonitor(library, token, limitSec, streakSec);
    reconcileProtectionState(snapshot);

    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not activate Screen Time protection. Try again.' };
  }
}

async function schedulePassReblock(library: DeviceActivity, minutes: number): Promise<void> {
  try {
    library.configureActions({
      activityName: PASS_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [],
    });
    try {
      library.stopMonitoring([PASS_ACTIVITY]);
    } catch {
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
  }
}

export async function grantTemporaryAccess(
  mode: ProtectionMode,
): Promise<{ minutes: number; granted: boolean }> {
  const library = mod();
  const minutes = passMinutesForMode(mode);
  if (!library) {
    return { minutes, granted: false };
  }
  const token = selectionToken(library);
  if (!token) {
    return { minutes, granted: false };
  }
  const passEndsAt = Date.now() + minutes * 60_000;

  try {
    configureDailyActions(library, new Date(passEndsAt));
    library.userDefaultsSet(USER_DEFAULTS_REBLOCK_KEY, passEndsAt);
    const { loadProtectionSnapshot } = await import('@/src/services/protectionStorage');
    reconcileProtectionState(await loadProtectionSnapshot());
  } catch {
    return { minutes, granted: false };
  }

  void schedulePassReblock(library, minutes);
  let limitSec = library.userDefaultsGet<number>(USER_DEFAULTS_DAILY_LIMIT_SECONDS_KEY);
  if (typeof limitSec !== 'number' || limitSec <= 0) {
    try {
      const { loadProtectionSnapshot } = await import('@/src/services/protectionStorage');
      const snapshot = await loadProtectionSnapshot();
      if (snapshot) {
        limitSec = Math.max(5, Math.round(dailyLimitFromSnapshot(snapshot) * 60));
        library.userDefaultsSet(USER_DEFAULTS_DAILY_LIMIT_SECONDS_KEY, limitSec);
      }
    } catch {
    }
  }
  if (typeof limitSec === 'number' && limitSec > 0) {
    const seconds = limitSec;
    void resolveGoalLock(Math.round(seconds / 60))
      .then(({ goalMin }) =>
        ensureDailyMonitor(library, token, seconds, Math.max(5, Math.round(goalMin * 60))),
      )
      .catch(() => {});
  }
  return { minutes, granted: true };
}

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

    const endsAt = new Date(Date.now() + targetMinutes * 60_000);
    library.userDefaultsSet(USER_DEFAULTS_FOCUS_UNTIL_KEY, endsAt.getTime());
    writeFocusShieldConfig(library, clockLabel(endsAt), durationLabel(targetMinutes));

    library.blockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-focus-start');

    if (targetMinutes >= MIN_SCHEDULE_MINUTES) {
      library.configureActions({
        activityName: FOCUS_ACTIVITY,
        callbackName: 'intervalDidEnd',
        actions: [],
      });
      try {
        library.stopMonitoring([FOCUS_ACTIVITY]);
      } catch {
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

export async function endFocusEnforcement(): Promise<void> {
  const library = mod();
  if (library) {
    try {
      library.stopMonitoring([FOCUS_ACTIVITY]);
      library.userDefaultsRemove(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    } catch {
    }
  }

  const { loadProtectionSnapshot } = await import('@/src/services/protectionStorage');
  const snapshot = await loadProtectionSnapshot();

  if (snapshot?.activated && snapshot.usingScreenTime) {
    await applyProtection(snapshot);
    return;
  }

  if (library) {
    try {
      library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
      library.unblockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-focus-end');
    } catch {
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

const DAILY_SHIELD_ID = 'daily';
const BEDTIME_SHIELD_ID = 'bedtime';
const FOCUS_SHIELD_ID = 'focus';

function writeNativeProtectionState(
  library: DeviceActivity,
  snapshot: ProtectionSnapshot,
): void {
  library.userDefaultsSet(USER_DEFAULTS_PROTECTION_ENABLED_KEY, true);
  library.userDefaultsSet(USER_DEFAULTS_BEDTIME_ENABLED_KEY, snapshot.bedtimeEnabled);
  library.userDefaultsSet(USER_DEFAULTS_BEDTIME_START_KEY, snapshot.bedtimeStart);
  library.userDefaultsSet(USER_DEFAULTS_BEDTIME_END_KEY, snapshot.bedtimeEnd);
}

export function reconcileProtectionState(snapshot: ProtectionSnapshot | null): void {
  if (!snapshot?.activated || !snapshot.usingScreenTime) {
    return;
  }
  const library = mod();
  if (!library || !selectionToken(library)) {
    return;
  }

  try {
    writeNativeProtectionState(library, snapshot);
    const now = Date.now();
    const focusUntil = library.userDefaultsGet<number>(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    const passUntil = library.userDefaultsGet<number>(USER_DEFAULTS_REBLOCK_KEY);
    const focusActive = typeof focusUntil === 'number' && focusUntil > now;
    const bedtimeActive =
      snapshot.bedtimeEnabled &&
      withinBedtimeWindow(snapshot.bedtimeStart, snapshot.bedtimeEnd);
    const dailyActive =
      dailyLimitReachedToday(library) &&
      !(typeof passUntil === 'number' && passUntil > now);

    if (focusActive) {
      library.useShieldWithId(FOCUS_SHIELD_ID);
      library.blockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-reconcile-focus');
      return;
    }
    if (bedtimeActive) {
      library.useShieldWithId(BEDTIME_SHIELD_ID);
      library.blockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-reconcile-bedtime');
      return;
    }
    if (dailyActive) {
      library.useShieldWithId(DAILY_SHIELD_ID);
      library.blockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-reconcile-daily');
      return;
    }

    if (focusUntil && focusUntil <= now) {
      library.userDefaultsRemove(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    }
    if (passUntil && passUntil <= now) {
      library.userDefaultsRemove(USER_DEFAULTS_REBLOCK_KEY);
    }
    library.unblockSelection({ activitySelectionId: PULL_SELECTION_ID }, 'pull-reconcile-open');
  } catch {
  }
}

function minutesClockLabel(totalMin: number): string {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

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

export async function applyBedtimeSchedule(
  snapshot: ProtectionSnapshot,
): Promise<{ ok: boolean; message?: string }> {
  const library = mod();
  if (!library) {
    return { ok: false, message: 'Screen Time is unavailable right now.' };
  }

  const clear = () => {
    try {
      library.stopMonitoring([BEDTIME_ACTIVITY]);
    } catch {
    }
  };

  if (!snapshot.activated || !snapshot.usingScreenTime || !snapshot.bedtimeEnabled) {
    library.userDefaultsSet(USER_DEFAULTS_BEDTIME_ENABLED_KEY, false);
    library.userDefaultsSet(USER_DEFAULTS_BEDTIME_START_KEY, snapshot.bedtimeStart);
    library.userDefaultsSet(USER_DEFAULTS_BEDTIME_END_KEY, snapshot.bedtimeEnd);
    clear();
    reconcileProtectionState(snapshot);
    return { ok: true };
  }
  const token = selectionToken(library);
  if (!token) {
    clear();
    return { ok: false, message: 'No Screen Time selection.' };
  }

  try {
    writeNativeProtectionState(library, snapshot);
    writeBedtimeShieldConfig(library, minutesClockLabel(snapshot.bedtimeEnd));

    library.configureActions({
      activityName: BEDTIME_ACTIVITY,
      callbackName: 'intervalDidStart',
      actions: [],
    });
    library.configureActions({
      activityName: BEDTIME_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [],
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
    reconcileProtectionState(snapshot);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not update Wind-Down. Try again.' };
  }
}

export function reblockIfScheduled(snapshot: ProtectionSnapshot | null): void {
  reconcileProtectionState(snapshot);
}

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
      return;
    }
    if (
      snapshot.bedtimeEnabled &&
      withinBedtimeWindow(snapshot.bedtimeStart, snapshot.bedtimeEnd)
    ) {
      return;
    }
    const { attempts } = await getLocalTodayStats();
    writeShieldConfig(library, getActiveMode(), attempts);
  } catch {
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
    library.userDefaultsRemove(USER_DEFAULTS_DAILY_LIMIT_SECONDS_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_PROTECTION_ENABLED_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_DAILY_REACHED_DAY_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_DAILY_MONITOR_SIGNATURE_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_BEDTIME_ENABLED_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_BEDTIME_START_KEY);
    library.userDefaultsRemove(USER_DEFAULTS_BEDTIME_END_KEY);
    library.userDefaultsRemove(DAILY_THRESHOLD_EVENT_KEY);
  } catch {
  }
}

export function clearProtectionState(): void {
  stopProtection();
  const library = mod();
  if (!library) {
    return;
  }
  try {
    library.userDefaultsRemove(USER_DEFAULTS_FOCUS_UNTIL_KEY);
    library.setFamilyActivitySelectionId({ id: PULL_SELECTION_ID, familyActivitySelection: '' });
    library.clearAllManagedSettingsStoreSettings?.();
  } catch {
  }
}

let appStateSubscription: { remove: () => void } | null = null;

export function startProtectionReblockListener(
  getSnapshot: () => ProtectionSnapshot | null,
): () => void {
  disableDailyLimitWarning();
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  const onChange = (state: AppStateStatus) => {
    if (state === 'active') {
      reblockIfScheduled(getSnapshot());
      void refreshDailyShield(getSnapshot());
      const snapshot = getSnapshot();
      if (snapshot?.activated && snapshot.usingScreenTime) {
        void applyProtection(snapshot);
      }
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
