import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { useSession } from '@/src/state/session';
import { getActiveMode } from '@/src/services/protection';
import { takePendingNav, whenInitialDeepLinkChecked } from '@/src/services/pendingNavigation';
import { palette } from '@/src/theme/palette';

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const handledRef = useRef(false);

  useEffect(() => {
    if (isLoading || handledRef.current) {
      return;
    }
    let active = true;
    // Let any cold-start deep link resolve first so the shield/notification target
    // wins over the default home redirect.
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
      if (user) {
        handledRef.current = true;
        router.replace('/(tabs)/home');
      }
    });
    return () => {
      active = false;
    };
  }, [isLoading, user, router]);

  const continueAsGuest = () => {
    router.replace('/(tabs)/home');
  };

  const signIn = () => {
    router.push('/auth/sign-in');
  };

  if (isLoading || user) {
    return (
      <Screen innerStyle={styles.centered}>
        <ActivityIndicator color={palette.brass} />
      </Screen>
    );
  }

  return (
    <Screen innerStyle={styles.inner}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Pull · est. 2026</Text>
        <Text style={styles.title}>
          Protect each other's{'\n'}
          <Text style={styles.accent}>attention.</Text>
        </Text>
        <Text style={styles.body}>
          Pull helps you protect your attention and come back before doomscrolling takes over.
        </Text>
      </View>

      <View style={styles.cta}>
        <Pressable onPress={() => router.push('/onboarding/questions')} style={styles.primary}>
          <Text style={styles.primaryLabel}>Begin</Text>
        </Pressable>
        <Pressable onPress={continueAsGuest} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Continue without account</Text>
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
});
