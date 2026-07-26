import * as AppleAuthentication from 'expo-apple-authentication';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { isLikelyNetworkError } from '@/src/lib/network';
import { syncProfileDisplayName } from '@/src/services/profile';

WebBrowser.maybeCompleteAuthSession();

/**
 * Native apps must use the custom scheme — not localhost (dev `makeRedirectUri` defaults break on device).
 * Add this exact value to Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export const authRedirectUri =
  Platform.OS === 'web'
    ? makeRedirectUri({ scheme: 'pull', path: 'auth/callback', preferLocalhost: false })
    : 'pull://auth/callback';

const redirectTo = authRedirectUri;

function formatAuthError(error: unknown, provider: 'apple' | 'google'): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('provider is not enabled') || message.includes('appleid.apple.com')) {
    return provider === 'apple'
      ? 'Apple sign-in is not enabled in Supabase. Go to Authentication → Providers → Apple, turn it on, and add your bundle ID + secret.'
      : 'Google sign-in is not enabled in Supabase. Go to Authentication → Providers → Google and turn it on.';
  }
  return message;
}

async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  const errorDescription = params.error_description ?? params.msg;
  if (errorCode || params.error || errorDescription) {
    const message = String(errorDescription ?? params.error ?? errorCode);
    if (message.includes('provider is not enabled')) {
      throw new Error(
        'Google sign-in is not enabled in Supabase. Turn on the Google provider under Authentication → Providers.',
      );
    }
    throw new Error(message);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signInWithApple(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw new Error(formatAuthError(error, 'apple'));
  }

  if (credential.fullName && data.user) {
    const name = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (name) {
      await syncProfileDisplayName(data.user, name);
    }
  }

  return data.session;
}

export async function signInWithGoogle(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(formatAuthError(error, 'google'));
  }

  if (!data.url) {
    throw new Error('Google sign-in URL was not returned.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return null;
  }

  if (result.url.includes('provider is not enabled')) {
    throw new Error(
      'Google sign-in is not enabled in Supabase. Turn on the Google provider under Authentication → Providers.',
    );
  }

  if (result.url.includes('redirect_uri_mismatch')) {
    throw new Error(
      'Google redirect URI mismatch. In Google Cloud Console, add https://<your-project>.supabase.co/auth/v1/callback to your Web OAuth client (see supabase/README.md).',
    );
  }

  return createSessionFromUrl(result.url);
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    if (!isLikelyNetworkError(error)) {
      throw error;
    }
    await supabase.auth.signOut({ scope: 'local' });
  }
}

/**
 * Permanently deletes the signed-in user's account and all their data (profile,
 * circle, focus sessions, usage history, subscription mirror) via the
 * `delete_my_account` RPC, then clears the local session. Required for App Store
 * Guideline 5.1.1(v). Irreversible.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    throw error;
  }
  // The auth row is gone server-side; clear only the local session (no server
  // round-trip to a user that no longer exists).
  await supabase.auth.signOut({ scope: 'local' });
}
