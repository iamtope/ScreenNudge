import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
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
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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

function parseDeepLink(url: string): PendingNav | null {
  try {
    if (url.startsWith('device-activity:')) {
      return { kind: 'intercept', app: 'app' };
    }
    const parsed = Linking.parse(url);
    const pathSegments = (parsed.path ?? '').split('/').filter(Boolean);
    const segments =
      (parsed.scheme === 'screennudge' || parsed.scheme === 'pull') && parsed.hostname
        ? [parsed.hostname, ...pathSegments]
        : pathSegments;
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
    if (segments[0] === 'invite' && segments[1]) {
      return { kind: 'invite', code: segments[1] };
    }
  } catch {
  }
  return null;
}

function navigateNav(router: ReturnType<typeof useRouter>, nav: PendingNav) {
  if (nav.kind === 'intercept') {
    router.replace({
      pathname: '/intercept/[app]',
      params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
    });
    return;
  }
  if (nav.kind === 'resist') {
    router.replace({
      pathname: '/resist/[app]',
      params: { app: nav.app, mode: nav.mode ?? getActiveMode() },
    });
    return;
  }
  if (nav.kind === 'invite') {
    router.replace({ pathname: '/invite/[code]', params: { code: nav.code } });
    return;
  }
  router.replace('/(tabs)/focus');
}

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const url = notification.request.content.data?.url;
        const isNavigationFallback = typeof url === 'string';
        const shouldPresent = !isNavigationFallback || AppState.currentState !== 'active';
        return {
          shouldShowBanner: shouldPresent,
          shouldShowList: shouldPresent,
          shouldPlaySound: shouldPresent,
          shouldSetBadge: false,
        };
      },
    });

    let cancelled = false;
    let coldStartResolved = false;
    let pendingWarmNav: PendingNav | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let lastHandledUrl: { url: string; at: number } | null = null;

    const rememberUrl = (url: string): boolean => {
      const now = Date.now();
      if (lastHandledUrl?.url === url && now - lastHandledUrl.at < 2_000) {
        return false;
      }
      lastHandledUrl = { url, at: now };
      return true;
    };

    const navigateSafely = (nav: PendingNav) => {
      const run = () => {
        if (cancelled) {
          return;
        }
        try {
          navigateNav(router, nav);
        } catch {
          retryTimer = setTimeout(() => {
            if (cancelled) {
              return;
            }
            try {
              navigateNav(router, nav);
            } catch {
            }
          }, 250);
        }
      };

      if (AppState.currentState === 'active') {
        retryTimer = setTimeout(run, 50);
      } else {
        pendingWarmNav = nav;
      }
    };

    const handleWarmUrl = (url: string) => {
      if (!rememberUrl(url)) {
        return;
      }
      const nav = parseDeepLink(url);
      if (!nav) {
        return;
      }
      if (!coldStartResolved) {
        setPendingNav(nav);
        return;
      }
      navigateSafely(nav);
    };

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleWarmUrl(url);
    });
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
      }
      if (typeof url === 'string') {
        handleWarmUrl(url);
      }
    });
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingWarmNav) {
        const nav = pendingWarmNav;
        pendingWarmNav = null;
        navigateSafely(nav);
      }
    });

    void (async () => {
      try {
        const lastResponse = Notifications.getLastNotificationResponse();
        if (lastResponse) {
          try {
            Notifications.clearLastNotificationResponse();
          } catch {
          }
        }
        const initialUrl = await Linking.getInitialURL();
        const notifUrl = lastResponse?.notification.request.content.data?.url;
        const url = initialUrl ?? (typeof notifUrl === 'string' ? notifUrl : null);
        const nav = url ? parseDeepLink(url) : null;
        if (url) {
          rememberUrl(url);
        }
        if (nav && !cancelled) {
          setPendingNav(nav);
        }
      } finally {
        coldStartResolved = true;
        markInitialDeepLinkChecked();
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      linkSub.remove();
      notifSub.remove();
      appStateSub.remove();
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
          <Stack.Screen name="onboarding/activate" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/circle" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/complete" options={{ headerShown: false }} />
          <Stack.Screen name="circle/join" options={{ headerShown: false }} />
          <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="intercept/[app]" options={{ headerShown: false }} />
          <Stack.Screen name="resist/[app]" options={{ headerShown: false }} />
          <Stack.Screen name="premium" options={{ headerShown: false }} />
          <Stack.Screen name="screen-time" options={{ headerShown: false }} />
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
