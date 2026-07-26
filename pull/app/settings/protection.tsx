import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import {
  SettingsActionRow,
  SettingsInfoRow,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import { formatMinutes, protectionModes, protectionModeName } from '@/src/domain/onboarding';
import { SCREEN_TIME_PROTECTION_ID, useOnboarding } from '@/src/state/onboarding';

export default function ProtectionSettingsScreen() {
  const router = useRouter();
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const [busy, setBusy] = useState(false);
  const {
    activated,
    protectedCount,
    usingScreenTime,
    getProtection,
    setMode,
    activateProtectionNow,
    protectionTargets,
  } = useOnboarding();

  const targetId = protectionTargets[0]?.id ?? SCREEN_TIME_PROTECTION_ID;
  const currentLimit = getProtection(targetId);
  const currentMode = currentLimit.mode;

  const reapplyShields = async () => {
    setBusy(true);
    try {
      const result = await activateProtectionNow();
      if (!result.ok) {
        Alert.alert('Screen Time', result.message ?? 'Could not re-apply blocks.');
      } else {
        Alert.alert('Protection active', 'Guarded apps are blocked again with your current nudge mode.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsScaffold title="Protection">
      <SettingsSection title="Status">
        <SettingsInfoRow
          label="Status"
          value={
            activated && protectedCount > 0
              ? `${protectedCount} app${protectedCount === 1 ? '' : 's'} · ${usingScreenTime ? 'Screen Time' : 'Demo list'}`
              : 'Not active'
          }
        />
        <SettingsInfoRow label="Daily limit" value={`${formatMinutes(currentLimit.dailyLimitMin)} · then Pull steps in`} />
        <SettingsInfoRow label="Opens / day" value={`${currentLimit.dailyOpens} · extra opens add friction`} />
        <SettingsInfoRow label="Nudge mode" value={protectionModeName(currentMode)} />
      </SettingsSection>

      <SettingsSection title="Nudge mode">
        {protectionModes.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => {
              protectionTargets.forEach((target) => setMode(target.id, mode.id));
              if (activated) {
                void activateProtectionNow();
              }
            }}
            style={[styles.modeRow, currentMode === mode.id && styles.modeRowActive]}
          >
            <Text style={styles.modeName}>{mode.name}</Text>
            <Text style={styles.modeHint}>{mode.tagline}</Text>
          </Pressable>
        ))}
      </SettingsSection>

      <SettingsSection title="Actions">
        <SettingsActionRow
          icon="cellphone-cog"
          label="Manage protected apps"
          onPress={() => router.push('/pull-plus/add-target')}
        />
        <SettingsActionRow
          icon="shield-refresh"
          label={busy ? 'Applying...' : 'Re-apply Screen Time shields'}
          disabled={busy}
          onPress={() => void reapplyShields()}
        />
      </SettingsSection>

      <Text style={styles.footnote}>
        Continue in Pull opens the pause flow. Close keeps the app blocked and records a resist.
      </Text>
    </SettingsScaffold>
  );
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    modeRow: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      gap: 4,
    },
    modeRowActive: { backgroundColor: colors.brassSoft },
    modeName: { color: colors.text, fontSize: 17, fontWeight: '700' },
    modeHint: { color: colors.textMute, fontSize: 14 },
    footnote: { color: colors.textMute, fontSize: 14, lineHeight: 20, marginTop: 8 },
  });
}
