import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton, SecondaryButton } from '@/src/components/Onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { palette } from '@/src/theme/palette';

export default function ActivateScreen() {
  const router = useRouter();
  const { protectedCount, activateProtectionNow } = useOnboarding();
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    try {
      const result = await activateProtectionNow();
      if (!result.ok) {
        Alert.alert(
          'Could not activate',
          result.message ??
            'Screen Time blocking could not start. On a real iPhone, pick apps again in onboarding, then tap Activate.',
        );
        return;
      }
      router.push('/onboarding/circle');
    } finally {
      setBusy(false);
    }
  };

  const summary = [
    `${protectedCount} protected app${protectedCount === 1 ? '' : 's'} selected`,
    'Apps stay usable until your daily limit',
    'After the limit, opening one brings up your Pull pause',
    'Your nudge mode sets how much friction the pause has',
    'Social rescue available',
  ];

  return (
    <OnboardingScaffold
      step="activate"
      title={
        <Text>
          Pull is <Accent>ready.</Accent>
        </Text>
      }
      subtitle="Your apps work normally until you hit your daily limit. After that, Screen Time hands you to Pull for a pause before you continue."
      footer={
        <>
          <PrimaryButton label={busy ? 'Activating…' : 'Activate Pull'} onPress={activate} />
          <SecondaryButton label="Edit Settings" onPress={() => router.push('/onboarding/plan')} />
        </>
      }
    >
      <View style={styles.card}>
        {summary.map((item) => (
          <View key={item} style={styles.row}>
            <View style={styles.check}>
              <MaterialCommunityIcons name="check" size={13} color={palette.bg} />
            </View>
            <Text style={styles.rowText}>{item}</Text>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 99,
    backgroundColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { color: palette.text, fontSize: 17, flex: 1 },
});
