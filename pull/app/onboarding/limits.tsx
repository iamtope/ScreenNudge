import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton } from '@/src/components/Onboarding';
import { ProtectionLimitsStep } from '@/src/components/protection/ProtectionLimitsStep';

export default function LimitsScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step="limits"
      title={
        <Text>
          How much time feels <Accent>intentional?</Accent>
        </Text>
      }
      subtitle="Set a daily time limit and how many opens feel right for each app. This is support, never punishment."
      footer={<PrimaryButton label="Continue" onPress={() => router.push('/onboarding/protection-style')} />}
    >
      <ProtectionLimitsStep />
    </OnboardingScaffold>
  );
}
