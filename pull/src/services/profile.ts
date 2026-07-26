import type { User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

export async function syncProfileDisplayName(user: User, displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return;
  }

  await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
}

export function displayNameFromAuthUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  if (typeof meta.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (typeof meta.name === 'string' && meta.name.trim()) {
    return meta.name.trim();
  }
  const given = typeof meta.given_name === 'string' ? meta.given_name : '';
  const family = typeof meta.family_name === 'string' ? meta.family_name : '';
  const combined = [given, family].filter(Boolean).join(' ').trim();
  return combined || null;
}
