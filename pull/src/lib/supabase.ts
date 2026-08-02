import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const resolvedUrl = supabaseUrl || 'https://placeholder.supabase.co';

/**
 * The AsyncStorage key the session is persisted under. This is the same value
 * supabase-js derives by default, pinned here so signing out can purge the
 * token itself when supabase refuses to (see `services/auth.ts`).
 */
export const authStorageKey = `sb-${resolvedUrl
  .replace(/^https?:\/\//, '')
  .split(/[/:?#]/)[0]
  .toLowerCase()
  .split('.')[0]}-auth-token`;

export const supabase = createClient(resolvedUrl, supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    storageKey: authStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
