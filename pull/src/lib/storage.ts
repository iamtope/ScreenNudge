import AsyncStorage from '@react-native-async-storage/async-storage';

export const PULL_PLUS_KEY = 'pull:isPullPlus';

export async function readPullPlusFlag(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PULL_PLUS_KEY);
  return value === 'true';
}

export async function writePullPlusFlag(active: boolean): Promise<void> {
  await AsyncStorage.setItem(PULL_PLUS_KEY, active ? 'true' : 'false');
}

export const ONBOARDING_COMPLETE_KEY = 'pull:onboardingComplete';

export async function readOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return value === 'true';
}

export async function writeOnboardingComplete(complete: boolean): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, complete ? 'true' : 'false');
}

export const PACER_ENABLED_KEY = 'pull:pacerEnabled';

export async function readPacerEnabledFlag(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PACER_ENABLED_KEY);
  return value !== 'false';
}

export async function writePacerEnabledFlag(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PACER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export const HIDDEN_MEMBERS_KEY = 'pull:hiddenMembers';

export async function readHiddenMembers(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_MEMBERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function writeHiddenMembers(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(HIDDEN_MEMBERS_KEY, JSON.stringify(ids));
}

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCE_KEY = 'pull:themePreference';

export async function readThemePreference(): Promise<ThemePreference> {
  const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function writeThemePreference(value: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, value);
}
