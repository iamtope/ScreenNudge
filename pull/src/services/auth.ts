import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { authStorageKey, isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { syncProfileDisplayName } from '@/src/services/profile';

WebBrowser.maybeCompleteAuthSession();

export const authRedirectUri =
  Platform.OS === 'web'
    ? makeRedirectUri({ scheme: 'pull', path: 'auth/callback', preferLocalhost: false })
    : 'pull://auth/callback';

const redirectTo = authRedirectUri;

function formatAuthError(): string {
  return 'Sign-in is temporarily unavailable. Try again.';
}

async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  const errorDescription = params.error_description ?? params.msg;
  if (errorCode || params.error || errorDescription) {
    throw new Error('Google sign-in could not be completed. Try again.');
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
    throw new Error('Sign-in is temporarily unavailable. Try again later.');
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
    throw new Error('Apple sign-in could not be completed. Try again.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw new Error(formatAuthError());
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
    throw new Error('Sign-in is temporarily unavailable. Try again later.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(formatAuthError());
  }

  if (!data.url) {
    throw new Error('Google sign-in could not be started. Try again.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return null;
  }

  if (result.url.includes('provider is not enabled')) {
    throw new Error('Google sign-in is temporarily unavailable. Try again later.');
  }

  if (result.url.includes('redirect_uri_mismatch')) {
    throw new Error('Google sign-in could not be completed. Try again later.');
  }

  return createSessionFromUrl(result.url);
}

/**
 * supabase.auth.signOut() bails out before clearing anything when it cannot load
 * the stored session first: an expired access token whose refresh call fails
 * leaves the token in AsyncStorage at every scope, so the user stays signed in.
 * Remove it ourselves, then let supabase clear the rest of its own keys and emit
 * SIGNED_OUT so the app's session state follows.
 */
async function clearLocalSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(authStorageKey);
  } catch {
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
  }
}

/**
 * Signing out always leaves this device signed out. Revoking the session
 * server-side is best effort — no connection, an expired token, or a session
 * that was already revoked must never keep the user logged in here.
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      return;
    }
  } catch {
  }
  await clearLocalSession();
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    throw error;
  }
  await clearLocalSession();
}
