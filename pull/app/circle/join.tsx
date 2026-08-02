import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  OnboardingScaffold,
  Accent,
  PrimaryButton,
  GhostButton,
} from '@/src/components/Onboarding';
import { useAccess } from '@/src/state/access';
import { useSession } from '@/src/state/session';
import { joinWithCode } from '@/src/services/circle';
import { friendlyAccountError } from '@/src/lib/network';
import { palette } from '@/src/theme/palette';

export default function JoinCircleScreen() {
  const router = useRouter();
  const { code: codeParam, returnTo } = useLocalSearchParams<{
    code?: string;
    returnTo?: string;
  }>();
  const { hasAccount } = useAccess();
  const { refreshCircle } = useSession();
  const [code, setCode] = useState(codeParam ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError('Enter a valid invite code.');
      return;
    }

    if (!hasAccount) {
      router.push({
        pathname: '/auth/sign-in',
        params: {
          redirect: returnTo === 'onboarding' ? 'onboarding-join' : 'join',
          invite: trimmed,
        },
      });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await joinWithCode(trimmed);
      await refreshCircle();
      router.replace(
        returnTo === 'onboarding' ? '/onboarding/circle' : '/(tabs)/leaderboard',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not join that circle.';
      if (message.includes('Invalid invite code')) {
        setError('That invite code was not found. Check the code and try again.');
      } else if (message.includes('Cannot join your own')) {
        setError('You cannot join your own invite code.');
      } else {
        setError(friendlyAccountError(err, 'Could not join that circle.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingScaffold
      title={
        <Text>
          Join a <Accent>circle.</Accent>
        </Text>
      }
      subtitle="Use the code your friend shared — not your own. You’ll join their circle."
      footer={
        <>
          <PrimaryButton
            label={busy ? 'Joining…' : 'Join circle'}
            onPress={submit}
          />
          <GhostButton label="Back" onPress={() => router.back()} />
        </>
      }
    >
      <View style={styles.form}>
        <Text style={styles.label}>Friend&apos;s invite code</Text>
        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="xWPqzJ"
          placeholderTextColor={palette.textMute}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={palette.brass} style={styles.spinner} /> : null}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10, marginTop: 12 },
  label: {
    color: palette.textMute,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: palette.text,
    fontSize: 20,
    letterSpacing: 2,
  },
  error: { color: palette.danger, fontSize: 14, lineHeight: 20 },
  spinner: { marginTop: 8 },
});
