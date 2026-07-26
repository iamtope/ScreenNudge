import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import 'react-native-reanimated';

import { getActiveMode } from '@/src/services/protection';
import type { ProtectionMode } from '@/src/domain/onboarding';
import {
  markInitialDeepLinkChecked,
  setPendingNav,
  type PendingNav,
} from '@/src/services/pendingNavigation';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingProvider } from '@/src/state/onboarding';
import { PacerProvider } from '@/src/state/pacer';
import { HiddenMembersProvider } from '@/src/state/hiddenMembers';
import { AccessProvider } from '@/src/state/access';
import { SessionProvider } from '@/src/state/session';
import { FocusProvider } from '@/src/state/focus';
import { AchievementsProvider } from '@/src/state/achievements';
import { BillingProvider } from '@/src/state/billing';
import { EntitlementSync } from '@/src/components/EntitlementSync';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/src/state/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function resolveInterceptMode(raw: string | string[] | undefined): ProtectionMode | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'gentle' || value === 'balanced' || value === 'strong') {
    return value;
  }
  return undefined;
}

/** Parse a deep-link URL into a navigation target (no navigation side effects). */
function parseDeepLink(url: string): PendingNav | null {
  // Legacy / library default scheme.
  if (url.startsWith('device-activity:')) {
    return { kind: 'intercept', app: 'app' };
  }
  const parsed = Linking.parse(url);
  // For a custom-scheme URL like `pull://intercept/app`, expo-linking parses the
  // first segment as the hostname (path becomes just `app`); other forms put it in
  // the path. Combine both so routing is robust to either parsing.
  const segments = `${parsed.hostname ?? ''}/${parsed.path ?? ''}`.split('/').filter(Boolean);
  const mode = resolveInterceptMode(parsed.queryParams?.mode);
  if (segments[0] === 'intercept') {
    return { kind: 'intercept', app: segments[1] ?? 'app', mode };
  }
  if (segments[0] === 'resist') {
    return { kind: 'resist', app: segments[1] ?? 'app', mode };
  }
  if (segments[0] === 'focus') {
    return { kind: 'focus' };
  }
  return null;
}

/** Navigate immediately (warm path — the router is already mounted). */
function navigateNav(router: ReturnType<typeof useRouter>, nav: PendingNav) {
  if (nav.kind === 'intercept') {
    router.push({
      pathname: '/intercept/[app]',
      params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
    });
    return;
  }
  if (nav.kind === 'resist') {
    router.push({
      pathname: '/resist/[app]',
      params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
    });
    return;
  }
  router.push('/(tabs)/focus');
}

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    let cancelled = false;

    // Cold start: resolve any launch URL / tapped notification, then hand the
    // target to the landing screen via the pending store so it isn't lost to the
    // default redirect race. Always mark "checked" so the landing screen unblocks.
    void (async () => {
      try {
        const [initialUrl, lastResponse] = await Promise.all([
          Linking.getInitialURL(),
          Notifications.getLastNotificationResponseAsync(),
        ]);
        const notifUrl = lastResponse?.notification.request.content.data?.url;
        const url = initialUrl ?? (typeof notifUrl === 'string' ? notifUrl : null);
        const nav = url ? parseDeepLink(url) : null;
        if (nav && !cancelled) {
          setPendingNav(nav);
        }
      } finally {
        markInitialDeepLinkChecked();
      }
    })();

    // Warm path: the app is already running, navigate right away.
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      const nav = parseDeepLink(url);
      if (nav) {
        navigateNav(router, nav);
      }
    });
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        const nav = parseDeepLink(url);
        if (nav) {
          navigateNav(router, nav);
        }
      }
    });

    return () => {
      cancelled = true;
      linkSub.remove();
      notifSub.remove();
    };
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <ThemePreferenceProvider>
      <ThemedRootLayoutNav />
    </ThemePreferenceProvider>
  );
}

function ThemedRootLayoutNav() {
  const { effectiveScheme } = useThemePreference();

  return (
    <SafeAreaProvider>
    <ThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
      <FocusProvider>
      <AchievementsProvider>
      <OnboardingProvider>
        <PacerProvider>
        <HiddenMembersProvider>
        <AccessProvider>
        <BillingProvider>
        <DeepLinkHandler />
        <EntitlementSync />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/questions" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/select-apps" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/limits" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/protection-style" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/plan" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/privacy" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/activate" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/circle" options={{ headerShown: false }} />
          <Stack.Screen name="circle/join" options={{ headerShown: false }} />
          <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="intercept/[app]" options={{ headerShown: false }} />
          <Stack.Screen name="resist/[app]" options={{ headerShown: false }} />
          <Stack.Screen name="premium" options={{ headerShown: false }} />
          <Stack.Screen name="pull-plus/add-target" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/appearance" options={{ headerShown: false }} />
          <Stack.Screen name="settings/protection" options={{ headerShown: false }} />
          <Stack.Screen name="settings/wind-down" options={{ headerShown: false }} />
          <Stack.Screen name="settings/benchmark-bots" options={{ headerShown: false }} />
          <Stack.Screen name="settings/hidden-friends" options={{ headerShown: false }} />
          <Stack.Screen name="settings/account" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        </BillingProvider>
        </AccessProvider>
        </HiddenMembersProvider>
        </PacerProvider>
      </OnboardingProvider>
      </AchievementsProvider>
      </FocusProvider>
      </SessionProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
