import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton, EditLaterNote } from '@/src/components/Onboarding';
import { ProtectionStyleStep } from '@/src/components/protection/ProtectionStyleStep';

export default function ProtectionStyleScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step="protection-style"
      title={
        <Text>
          How should ScreenNudge help you <Accent>come back?</Accent>
        </Text>
      }
      subtitle="Pick a protection style for your apps. You can fine-tune each app later."
      footer={
        <>
          <PrimaryButton label="Continue" onPress={() => router.push('/onboarding/plan')} />
          <EditLaterNote>Each app can use a different style later from Home.</EditLaterNote>
        </>
      }
    >
      <ProtectionStyleStep />
    </OnboardingScaffold>
  );
}
