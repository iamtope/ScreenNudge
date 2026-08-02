import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { useSession } from '@/src/state/session';
import { useOnboarding } from '@/src/state/onboarding';
import { getActiveMode } from '@/src/services/protection';
import { takePendingNav, whenInitialDeepLinkChecked } from '@/src/services/pendingNavigation';
import { palette } from '@/src/theme/palette';

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { onboardingComplete, hasProtectionSetup, hydrationReady } = useOnboarding();
  const handledRef = useRef(false);

  // Protection is local, so a guest who finished onboarding is just as set up as a
  // signed-in one — and an account on its own proves nothing, since the Screen Time
  // selection cannot come from the server. Route on the setup, not the session.
  const isReturning = onboardingComplete || hasProtectionSetup;

  useEffect(() => {
    if (isLoading || handledRef.current) {
      return;
    }
    let active = true;
    void whenInitialDeepLinkChecked().then(() => {
      if (!active || handledRef.current) {
        return;
      }
      const nav = takePendingNav();
      if (nav?.kind === 'intercept') {
        handledRef.current = true;
        router.replace({
          pathname: '/intercept/[app]',
          params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
        });
        return;
      }
      if (nav?.kind === 'resist') {
        handledRef.current = true;
        router.replace({
          pathname: '/resist/[app]',
          params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
        });
        return;
      }
      if (nav?.kind === 'focus') {
        handledRef.current = true;
        router.replace('/(tabs)/focus');
        return;
      }
      if (nav?.kind === 'invite') {
        handledRef.current = true;
        router.replace({ pathname: '/invite/[code]', params: { code: nav.code } });
        return;
      }
      // Deep links above are time-sensitive (the user just tapped a guarded app), so
      // only the returning-user redirect waits on the persisted onboarding flag.
      if (!hydrationReady) {
        return;
      }
      if (isReturning) {
        handledRef.current = true;
        router.replace('/(tabs)/home');
        return;
      }
      // Signed in with nothing guarded on this device (a fresh install of an existing
      // account). Offering "I already have an account" again would be nonsense — send
      // them to pick apps instead.
      if (user) {
        handledRef.current = true;
        router.replace('/onboarding/select-apps');
      }
    });
    return () => {
      active = false;
    };
  }, [isLoading, hydrationReady, isReturning, user, router]);

  const signIn = () => {
    router.push('/auth/sign-in');
  };

  // `user` is included so a signed-in account never flashes the marketing screen on
  // its way to select-apps.
  if (isLoading || !hydrationReady || isReturning || user) {
    return (
      <Screen innerStyle={styles.centered}>
        <ActivityIndicator color={palette.brass} />
      </Screen>
    );
  }

  return (
    <Screen innerStyle={styles.inner}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ScreenNudge · est. 2026</Text>
        <Text style={styles.title}>
          Take back your{'\n'}
          <Text style={styles.accent}>attention.</Text>
        </Text>
        <Text style={styles.body}>
          ScreenNudge helps you protect your attention and come back before doomscrolling takes over.
        </Text>
      </View>

      <View style={styles.cta}>
        <Pressable onPress={() => router.push('/onboarding/questions')} style={styles.primary}>
          <Text style={styles.primaryLabel}>Get started</Text>
        </Pressable>
        <Pressable onPress={signIn} style={styles.ghost}>
          <Text style={styles.ghostLabel}>I already have an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 28 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    color: palette.brass,
    textTransform: 'uppercase',
    letterSpacing: 2.6,
    fontSize: 13,
    marginBottom: 22,
  },
  title: { fontSize: 52, lineHeight: 56, color: palette.text, fontWeight: '700', marginBottom: 18 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  body: { color: palette.textSoft, fontSize: 18, lineHeight: 26, maxWidth: 310 },
  cta: { gap: 8 },
  primary: { backgroundColor: palette.brass, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryLabel: { color: palette.bg, fontSize: 16, fontWeight: '700' },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostLabel: { color: palette.textMute, fontSize: 14 },
  note: { color: palette.textMute, fontSize: 13, textAlign: 'center', paddingBottom: 6 },
});
