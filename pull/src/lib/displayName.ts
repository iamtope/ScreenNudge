import type { User } from '@supabase/supabase-js';

import type { CircleProfile } from '@/src/services/circle';

function nameFromUserMetadata(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const full =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    null;
  if (full?.trim()) {
    return full.trim();
  }

  const given = typeof meta.given_name === 'string' ? meta.given_name : '';
  const family = typeof meta.family_name === 'string' ? meta.family_name : '';
  const combined = [given, family].filter(Boolean).join(' ').trim();
  return combined || null;
}

export function getDisplayName(user: User | null, profile: CircleProfile | null): string {
  const fromProfile = profile?.displayName?.trim();
  if (fromProfile && fromProfile !== 'Pull user') {
    return fromProfile;
  }

  if (user) {
    const fromMeta = nameFromUserMetadata(user);
    if (fromMeta) {
      return fromMeta;
    }

    const emailLocal = user.email?.split('@')[0]?.trim();
    if (emailLocal) {
      return emailLocal;
    }
  }

  return 'there';
}

export function getFirstName(user: User | null, profile: CircleProfile | null): string {
  return getDisplayName(user, profile).split(' ')[0] ?? 'there';
}
