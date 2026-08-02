import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getInviteMessage } from '@/src/services/circle';
import { useSession } from '@/src/state/session';
import { palette } from '@/src/theme/palette';

type CircleInviteSectionProps = {
  canInvite?: boolean;
  onRequireSignIn?: () => void;
  compact?: boolean;
};

export function CircleInviteSection({
  canInvite = true,
  onRequireSignIn,
  compact = false,
}: CircleInviteSectionProps) {
  const router = useRouter();
  const { profile, refreshCircle } = useSession();
  const [sharing, setSharing] = useState(false);

  const inviteCode = profile?.inviteCode;

  const shareInvite = async () => {
    if (!canInvite) {
      onRequireSignIn?.();
      return;
    }

    setSharing(true);
    try {
      const refreshed = await refreshCircle();
      const code = refreshed?.inviteCode ?? inviteCode;
      if (!code) {
        Alert.alert(
          'Invite unavailable',
          'We could not load your invite code. Refresh your account and try again.',
        );
        return;
      }
      await Share.share({ message: getInviteMessage(code) });
    } finally {
      setSharing(false);
    }
  };

  const joinFriend = () => {
    if (!canInvite) {
      onRequireSignIn?.();
      return;
    }
    router.push('/circle/join');
  };

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <Text style={styles.lead}>
          Everyone gets their own code. Share yours so friends join you — or enter a friend&apos;s code
          to join them. You only need one of these for each friend.
        </Text>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.blockLabel}>You invite them</Text>
        <Text style={styles.blockHint}>Friends who use your code join your circle.</Text>
        {inviteCode ? <Text style={styles.codeValue}>{inviteCode}</Text> : null}
        <Pressable onPress={shareInvite} style={styles.primary}>
          <Text style={styles.primaryLabel}>{sharing ? 'Opening share…' : 'Share my invite'}</Text>
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>You were invited</Text>
        <Text style={styles.blockHint}>Enter your friend&apos;s code — not yours.</Text>
        <Pressable onPress={joinFriend} style={styles.secondary}>
          <Text style={styles.secondaryLabel}>Enter friend&apos;s code</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  lead: { color: palette.textSoft, fontSize: 15, lineHeight: 21 },
  block: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  blockLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  blockHint: { color: palette.textMute, fontSize: 14, lineHeight: 19 },
  codeValue: {
    color: palette.brass,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3,
    paddingVertical: 2,
  },
  primary: {
    backgroundColor: palette.brass,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: { color: palette.bg, fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.line },
  dividerText: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase' },
  secondary: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: { color: palette.text, fontWeight: '700', fontSize: 16 },
});
