import { websiteBlocklist } from '@/src/domain/appData';

export function matchesBlockedWebsite(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  return websiteBlocklist.some((domain) => normalized.includes(domain.toLowerCase()));
}

