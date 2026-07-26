import { Platform } from 'react-native';

// Real OS permission + Screen Time integration.
//
// IMPORTANT: react-native-device-activity's native view files call
// requireNativeViewManager() at import time, which throws if the native module
// isn't in the current binary (e.g. the Simulator build before a rebuild, or
// any build without the Family Controls entitlement). To keep the app from
// crashing in those cases, everything here is lazy-required and guarded. After
// `npm run ios` rebuilds with the new native modules, the real paths activate.

export type ScreenTimeAuthResult = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

type DeviceActivityModule = typeof import('react-native-device-activity');

let cachedModule: DeviceActivityModule | null | undefined;

function getDeviceActivity(): DeviceActivityModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require('react-native-device-activity') as DeviceActivityModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isScreenTimeAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const mod = getDeviceActivity();
  try {
    return !!mod && mod.isAvailable();
  } catch {
    return false;
  }
}

/** The native Family Activity picker (sheet) component, or null when unavailable. */
export function getAppPickerComponent(): DeviceActivityModule['DeviceActivitySelectionSheetView'] | null {
  if (!isScreenTimeAvailable()) return null;
  const mod = getDeviceActivity();
  return mod?.DeviceActivitySelectionSheetView ?? null;
}

/** Persists selection in the app group by id — survives app restarts (ScreenZen / One Sec pattern). */
export function getAppPickerComponentPersisted(): DeviceActivityModule['DeviceActivitySelectionSheetViewPersisted'] | null {
  if (!isScreenTimeAvailable()) return null;
  const mod = getDeviceActivity();
  return mod?.DeviceActivitySelectionSheetViewPersisted ?? null;
}

export async function requestScreenTimeAuthorization(): Promise<ScreenTimeAuthResult> {
  const mod = getDeviceActivity();
  if (!isScreenTimeAvailable() || !mod) return 'unavailable';
  try {
    await mod.requestAuthorization('individual');
    const status = await mod.pollAuthorizationStatus({ maxAttempts: 8 });
    if (status === mod.AuthorizationStatus.approved) return 'approved';
    if (status === mod.AuthorizationStatus.denied) return 'denied';
    return 'notDetermined';
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted || requested.status === 'granted';
  } catch {
    return false;
  }
}

export type OnboardingPermissions = {
  screenTime: ScreenTimeAuthResult;
  notifications: boolean;
};

/** Requests Screen Time + notification access up front, before app discovery. */
export async function requestOnboardingPermissions(): Promise<OnboardingPermissions> {
  const screenTime = await requestScreenTimeAuthorization();
  const notifications = await requestNotificationPermission();
  return { screenTime, notifications };
}
