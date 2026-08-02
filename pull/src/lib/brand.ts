export const APP_NAME = 'ScreenNudge';
export const DEFAULT_DISPLAY_NAME = `${APP_NAME} user`;

const LEGACY_DEFAULT_DISPLAY_NAME = 'Pull user';

export function normalizedDisplayName(value: string | null | undefined): string {
  const name = value?.trim();
  return name && name !== LEGACY_DEFAULT_DISPLAY_NAME ? name : DEFAULT_DISPLAY_NAME;
}

export function isDefaultDisplayName(value: string | null | undefined): boolean {
  const name = value?.trim();
  return !name || name === LEGACY_DEFAULT_DISPLAY_NAME || name === DEFAULT_DISPLAY_NAME;
}
