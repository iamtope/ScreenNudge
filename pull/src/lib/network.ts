const NETWORK_ERROR_HINTS = [
  'network request failed',
  'failed to fetch',
  'load failed',
  'internet connection appears to be offline',
  'network connection was lost',
  'timed out',
  'timeout',
  'err_network',
  'nsurlerrordomain',
  'could not connect',
  'offline',
];

export const ACCOUNT_OFFLINE_MESSAGE =
  'No internet connection. Pull keeps local protection and stats working on this device; reconnect to sync account features.';

export function isLikelyNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  return NETWORK_ERROR_HINTS.some((hint) => normalized.includes(hint));
}

export function friendlyAccountError(error: unknown, fallback: string): string {
  if (isLikelyNetworkError(error)) {
    return ACCOUNT_OFFLINE_MESSAGE;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
