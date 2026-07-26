import React, { useState } from 'react';
import { Alert, Share, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  OnboardingScaffold,
  Accent,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  EditLaterNote,
} from '@/src/components/Onboarding';
import { getInviteMessage } from '@/src/services/circle';
import { useAccess } from '@/src/state/access';
import { useCircleMembers, useSession } from '@/src/state/session';
import { palette } from '@/src/theme/palette';

export default function CircleScreen() {
  const router = useRouter();
  const { hasAccount } = useAccess();
  const { profile, refreshCircle } = useSession();
  const circleMembers = useCircleMembers();
  const [sharing, setSharing] = useState(false);

  const finish = () => router.replace('/(tabs)/home');

  const ensureAccount = () => {
    if (hasAccount) {
      return true;
    }
    router.push({ pathname: '/auth/sign-in', params: { redirect: 'onboarding' } });
    return false;
  };

  const inviteFriends = async () => {
    if (!ensureAccount()) {
      return;
    }

    setSharing(true);
    try {
      const refreshed = await refreshCircle();
      const code = refreshed?.inviteCode ?? profile?.inviteCode;
      if (!code) {
        Alert.alert(
          'Invite unavailable',
          'We could not load your invite code. Try again after signing in.',
        );
        return;
      }
      await Share.share({ message: getInviteMessage(code) });
    } finally {
      setSharing(false);
    }
  };

  const joinWithCode = () => {
    router.push('/circle/join');
  };

  const previewMembers = circleMembers.length > 0
    ? circleMembers.slice(0, 3)
    : [
        { id: 'preview-1', displayName: 'Friend', initial: 'F', tone: '#7a8a9a', inviteCode: '' },
        { id: 'preview-2', displayName: 'Friend', initial: 'F', tone: '#9a7a8a', inviteCode: '' },
      ];

  return (
    <OnboardingScaffold
      step="circle"
      title={
        <Text>
          Build your <Accent>circle.</Accent>
        </Text>
      }
      subtitle="Pull works best when someone can help you come back."
      footer={
        <>
          <PrimaryButton label={sharing ? 'Opening share…' : 'Invite Friends'} onPress={inviteFriends} />
          <SecondaryButton label="Join with Code" onPress={joinWithCode} />
          <GhostButton label="I'll Do This Later" onPress={finish} />
          <EditLaterNote>You can update apps, limits, styles, and your circle anytime from Home.</EditLaterNote>
        </>
      }
    >
      <View style={styles.orbit}>
        <View style={styles.you}>
          <Text style={styles.youLabel}>You</Text>
        </View>
        {previewMembers.map((friend, index) => {
          const angle = (index * 360) / previewMembers.length - 90;
          const r = 96;
          const x = Math.cos((angle * Math.PI) / 180) * r;
          const y = Math.sin((angle * Math.PI) / 180) * r;
          return (
            <View
              key={friend.id}
              style={[styles.friend, { left: 115 + x, top: 115 + y, backgroundColor: friend.tone }]}
            >
              <Text style={styles.friendInitial}>{friend.initial}</Text>
            </View>
          );
        })}
      </View>
      {profile?.inviteCode ? (
        <Text style={styles.codeLabel}>Your code: {profile.inviteCode}</Text>
      ) : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  orbit: { alignSelf: 'center', width: 230, height: 230, marginTop: 24 },
  you: {
    position: 'absolute',
    left: 85,
    top: 85,
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youLabel: { color: palette.brass, fontWeight: '700' },
  friend: {
    position: 'absolute',
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitial: { color: '#fff', fontWeight: '700' },
  codeLabel: {
    marginTop: 18,
    textAlign: 'center',
    color: palette.textMute,
    fontSize: 14,
    letterSpacing: 1,
  },
});
