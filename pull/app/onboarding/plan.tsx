import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton, SecondaryButton } from '@/src/components/Onboarding';
import { protectionModeName, formatMinutes, formatOpens } from '@/src/domain/onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { useAccess } from '@/src/state/access';
import { PlanComparison } from '@/src/components/PlanComparison';
import { palette } from '@/src/theme/palette';

export default function PlanScreen() {
  const router = useRouter();
  const { protectionTargets, getProtection, answers } = useOnboarding();
  const { isPullPlus } = useAccess();

  const lateNight = answers.timing === 'late-night';
  const socialSupport = answers.support && answers.support !== 'nobody';

  return (
    <OnboardingScaffold
      step="plan"
      title={
        <Text>
          Your <Accent>protection plan.</Accent>
        </Text>
      }
      subtitle="Here's what Pull will do. Adjust anything before continuing."
      footer={
        <>
          <PrimaryButton label="Looks Good" onPress={() => router.push('/onboarding/privacy')} />
          <SecondaryButton label="Edit Plan" onPress={() => router.push('/onboarding/limits')} />
        </>
      }
    >
      {protectionTargets.map((app) => {
        const { dailyLimitMin, dailyOpens, mode } = getProtection(app.id);
        return (
          <View key={app.id} style={styles.card}>
            <View style={styles.appRow}>
              <View style={styles.glyph}>
                <Text style={styles.glyphText}>{app.glyph}</Text>
              </View>
              <Text style={styles.appName}>{app.name}</Text>
            </View>
            <Text style={styles.line}>· {formatMinutes(dailyLimitMin)}/day</Text>
            <Text style={styles.line}>· {formatOpens(dailyOpens)}</Text>
            <Text style={styles.line}>· {protectionModeName(mode)} Protection</Text>
            {lateNight ? <Text style={styles.line}>· Stronger protection late at night</Text> : null}
            {socialSupport ? <Text style={styles.line}>· Friend Pull enabled</Text> : null}
          </View>
        );
      })}

      <PlanComparison isPullPlus={isPullPlus} onUpgrade={() => router.push('/premium')} />
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
    gap: 4,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  glyph: { width: 32, height: 32, borderRadius: 9, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' },
  glyphText: { color: palette.textSoft, fontSize: 17, fontWeight: '800' },
  appName: { color: palette.text, fontSize: 20, fontWeight: '700' },
  line: { color: palette.textSoft, fontSize: 16, lineHeight: 23 },
});
