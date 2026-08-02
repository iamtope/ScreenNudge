import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppSelectionBody,
  appSelectionPrimaryAction,
  appSelectionSecondaryAction,
  useAppSelection,
} from '@/src/components/protection/AppSelectionStep';
import { ManageScaffold, Accent } from '@/src/components/protection/ManageScaffold';
import { ProtectionLimitsStep } from '@/src/components/protection/ProtectionLimitsStep';
import { ProtectionStyleStep } from '@/src/components/protection/ProtectionStyleStep';
import { PrimaryButton, SecondaryButton } from '@/src/components/Onboarding';
import { useOnboarding } from '@/src/state/onboarding';

type Step = 'select' | 'limits' | 'style';
const TOTAL_STEPS = 3;

export default function ManageProtectionScreen() {
  const router = useRouter();
  const { activateProtectionNow } = useOnboarding();
  const [step, setStep] = useState<Step>('select');
  const selection = useAppSelection();

  const stepIndex = step === 'select' ? 1 : step === 'limits' ? 2 : 3;

  const goBack = () => {
    if (step === 'limits') setStep('select');
    else if (step === 'style') setStep('limits');
    else router.back();
  };

  const title =
    step === 'select' ? (
      selection.phase === 'native' ? (
        <Text>
          What apps <Accent>distract you?</Accent>
        </Text>
      ) : selection.phase === 'unavailable' ? (
        <Text>
          Screen Time is <Accent>required.</Accent>
        </Text>
      ) : (
        <Text>
          Choose apps to <Accent>protect.</Accent>
        </Text>
      )
    ) : step === 'limits' ? (
      <Text>
        How much time feels <Accent>intentional?</Accent>
      </Text>
    ) : (
      <Text>
        How should ScreenNudge help you <Accent>come back?</Accent>
      </Text>
    );

  const subtitle =
    step === 'select'
      ? selection.phase === 'native'
        ? 'Choose the apps you want ScreenNudge to protect using your device’s Screen Time picker.'
        : selection.phase === 'unavailable'
          ? 'ScreenNudge cannot protect apps without Screen Time access on this device.'
          : 'ScreenNudge asks for Screen Time and notification access, then opens Apple’s picker so you can choose apps privately on-device.'
      : step === 'limits'
        ? 'Set the daily time limit that feels intentional. ScreenNudge adapts the pause if you keep coming back.'
        : 'Pick a protection style for your apps. You can fine-tune each app later.';

  const finish = async () => {
    await activateProtectionNow();
    router.back();
  };

  const goPlus = () => router.push('/premium');
  const secondaryAction = step === 'select' ? appSelectionSecondaryAction(selection, goPlus) : null;

  const primaryAction =
    step === 'select'
      ? appSelectionPrimaryAction(selection, () => setStep('limits'))
      : step === 'limits'
        ? { label: 'Continue', onPress: () => setStep('style'), disabled: false }
        : { label: 'Save protection', onPress: finish, disabled: false };

  return (
    <ManageScaffold
      step={stepIndex}
      totalSteps={TOTAL_STEPS}
      onBack={goBack}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <PrimaryButton
            label={primaryAction.label}
            onPress={primaryAction.onPress}
            disabled={primaryAction.disabled}
          />
          {secondaryAction ? (
            <SecondaryButton label={secondaryAction.label} onPress={secondaryAction.onPress} />
          ) : null}
        </>
      }
    >
      {step === 'select' ? <AppSelectionBody {...selection} onUpgrade={() => router.push('/premium')} /> : null}
      {step === 'limits' ? <ProtectionLimitsStep /> : null}
      {step === 'style' ? <ProtectionStyleStep /> : null}
    </ManageScaffold>
  );
}
