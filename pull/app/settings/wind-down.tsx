import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  SettingsActionRow,
  SettingsInfoRow,
  SettingsNote,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import { useGate } from '@/src/state/access';
import { useOnboarding } from '@/src/state/onboarding';

const STEP_MIN = 30;

export default function WindDownSettingsScreen() {
  const router = useRouter();
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const { unlocked: pullPlusUnlocked } = useGate('pullPlus');
  const {
    activated,
    bedtimeEnabled,
    bedtimeStart,
    bedtimeEnd,
    setBedtime,
  } = useOnboarding();

  return (
    <SettingsScaffold title="Wind-Down">
      <SettingsSection title="Bedtime blocking">
        {!pullPlusUnlocked ? (
          <>
            <SettingsInfoRow label="Bedtime blocking" value="ScreenNudge+" />
            <SettingsNote>
              Auto-block your guarded apps during sleep hours. Protect your wind-down and morning
              from the apps that pull hardest.
            </SettingsNote>
            <SettingsActionRow
              icon="star-circle-outline"
              label="Unlock with premium"
              onPress={() => router.push('/premium')}
            />
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Bedtime blocking</Text>
              <Switch
                value={bedtimeEnabled}
                onValueChange={(value) => setBedtime(value, bedtimeStart, bedtimeEnd)}
                trackColor={{ false: colors.line, true: colors.brass }}
                thumbColor={colors.text}
              />
            </View>
            {bedtimeEnabled ? (
              <>
                <TimeStepperRow
                  label="Sleep starts"
                  value={bedtimeStart}
                  onMinus={() => setBedtime(true, wrapMinutes(bedtimeStart - STEP_MIN), bedtimeEnd)}
                  onPlus={() => setBedtime(true, wrapMinutes(bedtimeStart + STEP_MIN), bedtimeEnd)}
                />
                <TimeStepperRow
                  label="Wake up"
                  value={bedtimeEnd}
                  onMinus={() => setBedtime(true, bedtimeStart, wrapMinutes(bedtimeEnd - STEP_MIN))}
                  onPlus={() => setBedtime(true, bedtimeStart, wrapMinutes(bedtimeEnd + STEP_MIN))}
                />
                <SettingsNote>
                  Guarded apps stay blocked from {formatClockTime(bedtimeStart)} to{' '}
                  {formatClockTime(bedtimeEnd)}.
                  {!activated ? ' Activate protection to enable it.' : ''}
                </SettingsNote>
              </>
            ) : null}
          </>
        )}
      </SettingsSection>
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

function TimeStepperRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const colors = useSettingsColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={onMinus} hitSlop={8} style={styles.stepBtn}>
          <Text style={styles.stepBtnLabel}>-</Text>
        </Pressable>
        <Text style={styles.stepValue}>{formatClockTime(value)}</Text>
        <Pressable onPress={onPlus} hitSlop={8} style={styles.stepBtn}>
          <Text style={styles.stepBtnLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      gap: 12,
    },
    rowLabel: { color: colors.textSoft, fontSize: 16 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: {
      width: 30,
      height: 30,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: colors.brass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnLabel: { color: colors.brass, fontSize: 20, fontWeight: '700', lineHeight: 22 },
    stepValue: { color: colors.text, fontSize: 16, fontWeight: '700', minWidth: 78, textAlign: 'center' },
  });
}
