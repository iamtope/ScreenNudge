import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton } from '@/src/components/Onboarding';
import { palette } from '@/src/theme/palette';

const privacyPoints = [
  'Core blocking settings stay on the device',
  'Core usage data is stored only on the device where possible',
  'Pull does not collect personally identifiable information for core protection',
  'Friends only see what you choose to share — attempt counts, time saved, rescue requests, streaks',
  'Analytics and diagnostics may improve the app, but are not linked to your identity where possible',
];

const permissions = [
  { name: 'Notifications', detail: 'So Pull and your circle can reach you at the right moment.' },
  { name: 'Screen Time access', detail: 'So Pull can intercept apps and track time on device.' },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step="privacy"
      title={
        <Text>
          Your data <Accent>stays yours.</Accent>
        </Text>
      }
      subtitle="Pull never shares what you watch, read, or search."
      footer={<PrimaryButton label="Continue" onPress={() => router.push('/onboarding/activate')} />}
    >
      <View style={styles.card}>
        {privacyPoints.map((point) => (
          <View key={point} style={styles.point}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Permissions needed</Text>
      {permissions.map((perm) => (
        <View key={perm.name} style={styles.permCard}>
          <Text style={styles.permName}>{perm.name}</Text>
          <Text style={styles.permDetail}>{perm.detail}</Text>
        </View>
      ))}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  point: { flexDirection: 'row', gap: 8 },
  dot: { color: palette.brass, fontSize: 16, lineHeight: 22 },
  pointText: { color: palette.textSoft, fontSize: 15, lineHeight: 22, flex: 1 },
  sectionLabel: { color: palette.textMute, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 4 },
  permCard: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  permName: { color: palette.text, fontSize: 18, fontWeight: '700' },
  permDetail: { color: palette.textSoft, fontSize: 15, lineHeight: 20 },
});
