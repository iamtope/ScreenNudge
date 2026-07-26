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
  useAppSelection,
} from '@/src/components/protection/AppSelectionStep';

export default function SelectAppsScreen() {
  const router = useRouter();
  const selection = useAppSelection();
  const goNext = () => router.push('/onboarding/limits');
  const goPlus = () => router.push('/premium');
  const primary = appSelectionPrimaryAction(selection, goNext, goPlus);

  return (
    <OnboardingScaffold
      step="select-apps"
      title={
        <Text>
          {selection.phase === 'native' ? (
            <>
              What apps <Accent>pull you in?</Accent>
            </>
          ) : selection.phase === 'unavailable' ? (
            <>
              Screen Time is <Accent>required.</Accent>
            </>
          ) : (
            <>
              Let's find the apps that <Accent>pull you in.</Accent>
            </>
          )}
        </Text>
      }
      subtitle={
        selection.phase === 'native'
          ? 'Choose the apps you want Pull to protect using your device’s Screen Time picker.'
          : selection.phase === 'unavailable'
            ? 'Pull cannot protect apps without Screen Time access on this device.'
            : 'Pull asks for Screen Time and notification access, then opens Apple’s picker so you can choose apps privately on-device.'
      }
      footer={
        <>
          <PrimaryButton
            label={primary.label}
            onPress={primary.onPress}
            disabled={primary.disabled}
          />
          {selection.phase === 'native' && selection.protectedCount > 0 ? (
            <SecondaryButton label="Change selection" onPress={() => selection.setPickerVisible()} />
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
