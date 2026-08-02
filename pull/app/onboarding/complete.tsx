import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { CelebrationOverlay } from '@/src/components/CelebrationOverlay';
import { Screen } from '@/src/components/Screen';
import type { Celebration } from '@/src/domain/achievements';

const COMPLETION_SHOWN_KEY = 'pull:onboarding:completion-shown:v1';

const ONBOARDING_MILESTONE: Celebration = {
  id: 'onboarding_complete',
  title: 'ScreenNudge is ready',
  description: 'Your first milestone: your attention now has a line of defence.',
  icon: 'shield-check',
};

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const alreadyShown = await AsyncStorage.getItem(COMPLETION_SHOWN_KEY);
        if (cancelled) {
          return;
        }
        if (alreadyShown) {
          router.replace('/(tabs)/home');
          return;
        }
        await AsyncStorage.setItem(COMPLETION_SHOWN_KEY, new Date().toISOString());
      } catch {
      }
      if (!cancelled) {
        setCelebration(ONBOARDING_MILESTONE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Screen>
      <CelebrationOverlay
        achievement={celebration}
        eyebrow="First milestone"
        onDone={() => router.replace('/(tabs)/home')}
      />
    </Screen>
  );
}
