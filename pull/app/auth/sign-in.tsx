import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/src/components/Screen';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { friendlyAccountError } from '@/src/lib/network';
import { signInWithApple, signInWithGoogle } from '@/src/services/auth';
import { useSession } from '@/src/state/session';
import { palette } from '@/src/theme/palette';

export default function SignInScreen() {
  const router = useRouter();
  const { redirect, invite } = useLocalSearchParams<{ redirect?: string; invite?: string }>();
  const { refreshCircle, setPendingInviteCode } = useSession();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    await refreshCircle();

    if (invite) {
      router.replace(`/invite/${invite}`);
      return;
    }

    if (redirect === 'onboarding') {
      router.replace('/onboarding/circle');
      return;
    }

    if (redirect === 'premium') {
      router.replace('/premium');
      return;
    }

    if (redirect === 'join' && invite) {
      router.replace({ pathname: '/circle/join', params: { code: invite } });
      return;
    }

    router.replace('/(tabs)/home');
  };

  const handleApple = async () => {
    setError(null);
    setBusy('apple');
    try {
      if (invite) {
        setPendingInviteCode(invite);
      }
      const session = await signInWithApple();
      if (session) {
        await finish();
      }
    } catch (err) {
      setError(friendlyAccountError(err, 'Apple sign-in failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      if (invite) {
        setPendingInviteCode(invite);
      }
      const session = await signInWithGoogle();
      if (session) {
        await finish();
      }
    } catch (err) {
      setError(friendlyAccountError(err, 'Google sign-in failed.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen innerStyle={styles.inner}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Pull account</Text>
        <Text style={styles.title}>
          Sign in to unlock{'\n'}
          <Text style={styles.accent}>your circle.</Text>
        </Text>
        <Text style={styles.body}>
          Save your progress, invite friends, and compete on resists together.
        </Text>
      </View>

      <View style={styles.actions}>
        {!isSupabaseConfigured ? (
          <Text style={styles.warning}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a local .env file.
          </Text>
        ) : null}

        {Platform.OS === 'ios' ? (
          busy === 'apple' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.brass} />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={16}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )
        ) : null}

        <GoogleSignInButton loading={busy === 'google'} disabled={busy !== null} onPress={handleGoogle} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={() => router.back()} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Not now</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 28 },
  hero: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    color: palette.brass,
    textTransform: 'uppercase',
    letterSpacing: 2.6,
    fontSize: 13,
    marginBottom: 22,
  },
  title: { fontSize: 44, lineHeight: 48, color: palette.text, fontWeight: '700', marginBottom: 14 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  body: { color: palette.textSoft, fontSize: 18, lineHeight: 26, maxWidth: 320 },
  actions: { gap: 10, paddingBottom: 8 },
  appleButton: { width: '100%', height: 52 },
  buttonDisabled: { opacity: 0.7 },
  loadingRow: { height: 52, alignItems: 'center', justifyContent: 'center' },
  warning: { color: palette.textMute, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  error: { color: palette.danger, fontSize: 14, lineHeight: 20 },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostLabel: { color: palette.textMute, fontSize: 14 },
});
