import { Platform } from 'react-native';

export type ScreenTimeAuthResult = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

type DeviceActivityModule = typeof import('react-native-device-activity');

let cachedModule: DeviceActivityModule | null | undefined;

function getDeviceActivity(): DeviceActivityModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
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

export function getAppPickerComponent(): DeviceActivityModule['DeviceActivitySelectionSheetView'] | null {
  if (!isScreenTimeAvailable()) return null;
  const mod = getDeviceActivity();
  return mod?.DeviceActivitySelectionSheetView ?? null;
}

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

export async function requestOnboardingPermissions(): Promise<OnboardingPermissions> {
  const screenTime = await requestScreenTimeAuthorization();
  const notifications = await requestNotificationPermission();
  return { screenTime, notifications };
}
