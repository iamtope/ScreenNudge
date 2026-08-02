import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/src/components/Screen';
import { joinWithCode } from '@/src/services/circle';
import { useAccess } from '@/src/state/access';
import { useSession } from '@/src/state/session';
import { friendlyAccountError } from '@/src/lib/network';
import { palette } from '@/src/theme/palette';

export default function InviteDeepLinkScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { hasAccount, isLoading: accessLoading } = useAccess();
  const { refreshCircle } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessLoading) {
      return;
    }

    const inviteCode = String(code ?? '').trim();
    if (!inviteCode) {
      router.replace('/');
      return;
    }

    if (!hasAccount) {
      router.replace({ pathname: '/auth/sign-in', params: { invite: inviteCode } });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await joinWithCode(inviteCode);
        await refreshCircle();
        if (!cancelled) {
          router.replace('/(tabs)/leaderboard');
        }
      } catch (err) {
        if (!cancelled) {
          setError(friendlyAccountError(err, 'Could not join that circle.'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessLoading, code, hasAccount, refreshCircle, router]);

  return (
    <Screen innerStyle={styles.inner}>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.title}>Invite failed</Text>
          <Text style={styles.body}>{error}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={palette.brass} size="large" />
          <Text style={styles.body}>Joining your friend’s circle…</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { color: palette.text, fontSize: 26, fontWeight: '700' },
  body: { color: palette.textSoft, fontSize: 16, textAlign: 'center' },
});
