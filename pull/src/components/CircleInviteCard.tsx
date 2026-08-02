import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CircleInviteSection } from '@/src/components/CircleInviteSection';
import { useAccess } from '@/src/state/access';
import { palette } from '@/src/theme/palette';

export function CircleInviteCard() {
  const router = useRouter();
  const { hasAccount } = useAccess();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add friends to your circle</Text>
      <Text style={styles.body}>
        Free with your account. Add a friend to see how you are both doing, and focus together.
      </Text>
      <CircleInviteSection
        canInvite={hasAccount}
        onRequireSignIn={() => router.push('/auth/sign-in')}
        compact
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  title: { color: palette.text, fontSize: 18, fontWeight: '700' },
  body: { color: palette.textSoft, fontSize: 15, lineHeight: 21 },
});
