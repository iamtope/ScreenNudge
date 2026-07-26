import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppSelectionBody,
  appSelectionPrimaryAction,
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
          What apps <Accent>pull you in?</Accent>
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
        How should Pull help you <Accent>come back?</Accent>
      </Text>
    );

  const subtitle =
    step === 'select'
      ? selection.phase === 'native'
        ? 'Choose the apps you want Pull to protect using your device’s Screen Time picker.'
        : selection.phase === 'unavailable'
          ? 'Pull cannot protect apps without Screen Time access on this device.'
          : 'Pull asks for Screen Time and notification access, then opens Apple’s picker so you can choose apps privately on-device.'
      : step === 'limits'
        ? 'Set a daily time limit and how many opens feel right for each app.'
        : 'Pick a protection style for your apps. You can fine-tune each app later.';

  const finish = async () => {
    await activateProtectionNow();
    router.back();
  };

  const primaryAction =
    step === 'select'
      ? appSelectionPrimaryAction(selection, () => setStep('limits'), () => router.push('/premium'))
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
          {step === 'select' && selection.phase === 'native' && selection.protectedCount > 0 ? (
            <SecondaryButton label="Change selection" onPress={() => selection.setPickerVisible()} />
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
