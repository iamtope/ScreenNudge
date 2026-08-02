import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  OnboardingScaffold,
  Accent,
  PrimaryButton,
  SecondaryButton,
  EditLaterNote,
} from '@/src/components/Onboarding';
import {
  AppSelectionBody,
  appSelectionPrimaryAction,
  appSelectionSecondaryAction,
  useAppSelection,
} from '@/src/components/protection/AppSelectionStep';

export default function SelectAppsScreen() {
  const router = useRouter();
  const selection = useAppSelection();
  const goNext = () => router.push('/onboarding/limits');
  // Come back here after upgrading instead of being dropped on Home mid-onboarding.
  const goPlus = () =>
    router.push({ pathname: '/premium', params: { returnTo: 'onboarding-select-apps' } });
  const primary = appSelectionPrimaryAction(selection, goNext);
  const secondary = appSelectionSecondaryAction(selection, goPlus);

  return (
    <OnboardingScaffold
      step="select-apps"
      title={
        <Text>
          {selection.phase === 'native' ? (
            <>
              What apps <Accent>distract you?</Accent>
            </>
          ) : selection.phase === 'unavailable' ? (
            <>
              Screen Time is <Accent>required.</Accent>
            </>
          ) : (
            <>
              Let's find the apps that <Accent>distract you.</Accent>
            </>
          )}
        </Text>
      }
      subtitle={
        selection.phase === 'native'
          ? 'Choose the apps you want ScreenNudge to protect using your device’s Screen Time picker.'
          : selection.phase === 'unavailable'
            ? 'ScreenNudge cannot protect apps without Screen Time access on this device.'
            : 'ScreenNudge asks for Screen Time and notification access, then opens Apple’s picker so you can choose apps privately on-device.'
      }
      footer={
        <>
          <PrimaryButton
            label={primary.label}
            onPress={primary.onPress}
            disabled={primary.disabled}
          />
          {secondary ? (
            <SecondaryButton label={secondary.label} onPress={secondary.onPress} />
          ) : null}
          {selection.phase === 'native' ? (
            <EditLaterNote>You can change protected apps anytime from Home.</EditLaterNote>
          ) : null}
        </>
      }
    >
      <AppSelectionBody {...selection} onUpgrade={goPlus} />
    </OnboardingScaffold>
  );
}
