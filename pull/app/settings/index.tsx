import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

import {
  SettingsNavRow,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import { SCREEN_TIME_PROTECTION_ID, useOnboarding } from '@/src/state/onboarding';
import { useGate } from '@/src/state/access';
import { useHiddenMembers } from '@/src/state/hiddenMembers';
import { usePacer } from '@/src/state/pacer';
import { useSession } from '@/src/state/session';
import { getFirstName } from '@/src/lib/displayName';
import {
  themePreferenceLabel,
  useThemePreference,
} from '@/src/state/theme';
import { formatMinutes, protectionModeName } from '@/src/domain/onboarding';

const SOCIALS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    handle: '@pull.app',
    url: 'https://www.tiktok.com/@pull.app',
    icon: 'tiktok',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@pull.app',
    url: 'https://www.instagram.com/pull.app/',
    icon: 'instagram',
  },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const { user, profile } = useSession();
  const { hidden } = useHiddenMembers();
  const { enabled: pacerEnabled } = usePacer();
  const { preference } = useThemePreference();
  const { unlocked: pullPlusUnlocked } = useGate('pullPlus');
  const {
    activated,
    protectedCount,
    usingScreenTime,
    protectionTargets,
    getProtection,
    bedtimeEnabled,
    bedtimeStart,
    bedtimeEnd,
  } = useOnboarding();

  const targetId = protectionTargets[0]?.id ?? SCREEN_TIME_PROTECTION_ID;
  const currentLimit = getProtection(targetId);
  const firstName = getFirstName(user, profile);
  const protectionValue =
    activated && protectedCount > 0
      ? `${protectionModeName(currentLimit.mode)} · ${protectedCount} ${usingScreenTime ? 'Screen Time' : 'demo'}`
      : 'Not active';
  const windDownValue = !pullPlusUnlocked
    ? 'Pull+'
    : bedtimeEnabled
      ? `${formatClockTime(bedtimeStart)}-${formatClockTime(bedtimeEnd)}`
      : 'Off';

  const openSocial = async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, 'Could not open this link.');
    }
  };

  return (
    <SettingsScaffold
      title={firstName}
      subtitle={profile?.inviteCode ? `Your invite code · ${profile.inviteCode}` : null}
    >
      <SettingsSection title="App">
        <SettingsNavRow
          icon="theme-light-dark"
          label="Theme"
          value={themePreferenceLabel(preference)}
          onPress={() => router.push('/settings/appearance')}
        />
      </SettingsSection>

      <SettingsSection title="Protection">
        <SettingsNavRow
          icon="shield-half-full"
          label="Protection"
          value={protectionValue}
          onPress={() => router.push('/settings/protection')}
        />
        <SettingsNavRow
          icon="weather-night"
          label="Wind-Down"
          value={windDownValue}
          onPress={() => router.push('/settings/wind-down')}
        />
        <SettingsNavRow
          icon="robot"
          label="Benchmark bots"
          value={pacerEnabled ? 'On' : 'Off'}
          onPress={() => router.push('/settings/benchmark-bots')}
        />
      </SettingsSection>

      <SettingsSection title="Circle">
        <SettingsNavRow
          icon="eye-off-outline"
          label="Hidden friends"
          value={hidden.size ? String(hidden.size) : 'None'}
          onPress={() => router.push('/settings/hidden-friends')}
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsNavRow
          icon={user ? 'account-circle-outline' : 'login'}
          label={user ? 'Account' : 'Sign in'}
          value={user ? 'Signed in' : null}
          onPress={() => (user ? router.push('/settings/account') : router.push('/auth/sign-in'))}
        />
        <SettingsNavRow
          icon="star-circle-outline"
          label="Pull+ subscription"
          value={pullPlusUnlocked ? 'Active' : null}
          onPress={() => router.push('/premium')}
        />
      </SettingsSection>

      <SettingsSection title="Follow Pull">
        {SOCIALS.map((social) => (
          <Pressable
            key={social.id}
            onPress={() => void openSocial(social.url, social.label)}
            style={styles.socialRow}
          >
            <View style={styles.socialLeft}>
              <FontAwesome6 name={social.icon} size={18} color={colors.brass} />
              <Text style={styles.socialLabel}>{social.label}</Text>
            </View>
            <Text style={styles.socialHandle}>{social.handle}</Text>
          </Pressable>
        ))}
      </SettingsSection>

      <Text style={styles.footnote}>
        On iPhone, guarded apps use Apple&apos;s Screen Time shield. Tap Continue in Pull for the
        pause flow, or Close to keep the app blocked and count the win.
      </Text>
    </SettingsScaffold>
  );
}

function wrapMinutes(min: number): number {
  return ((Math.round(min) % 1440) + 1440) % 1440;
}

function formatClockTime(min: number): string {
  const total = wrapMinutes(min);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    socialRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    socialLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    socialLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
    socialHandle: { color: colors.textMute, fontSize: 14, fontWeight: '700' },
    footnote: { color: colors.textMute, fontSize: 13, lineHeight: 19, marginTop: 8 },
  });
}
