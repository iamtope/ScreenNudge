import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Dropdown, type DropdownOption } from '@/src/components/Onboarding';
import {
  dailyLimitOptions,
  formatMinutes,
  softWarningMinutes,
} from '@/src/domain/onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { palette } from '@/src/theme/palette';

const CUSTOM = 'custom';
const MIN_LIMIT = 5;
const MAX_LIMIT = 240;

function limitOptions(current: number): DropdownOption[] {
  const opts: DropdownOption[] = dailyLimitOptions.map((m) => ({ label: formatMinutes(m), value: String(m) }));
  if (!dailyLimitOptions.includes(current)) {
    opts.push({ label: `${formatMinutes(current)} (custom)`, value: String(current) });
  }
  opts.push({ label: 'Custom…', value: CUSTOM });
  return opts;
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={onPlus} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

export function ProtectionLimitsStep() {
  const { protectionTargets, getProtection, setDailyLimit } = useOnboarding();
  const [customLimit, setCustomLimit] = useState<Record<string, boolean>>({});

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  return (
    <>
      {protectionTargets.map((app) => {
        const { dailyLimitMin } = getProtection(app.id);
        const showLimitStepper = customLimit[app.id] || !dailyLimitOptions.includes(dailyLimitMin);

        return (
          <View key={app.id} style={styles.card}>
            <View style={styles.appRow}>
              <View style={styles.glyph}>
                <Text style={styles.glyphText}>{app.glyph}</Text>
              </View>
              <Text style={styles.appName}>{app.name}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Daily time limit</Text>
              <Dropdown
                value={String(dailyLimitMin)}
                options={limitOptions(dailyLimitMin)}
                onSelect={(v) => {
                  if (v === CUSTOM) {
                    setCustomLimit((p) => ({ ...p, [app.id]: true }));
                  } else {
                    setCustomLimit((p) => ({ ...p, [app.id]: false }));
                    setDailyLimit(app.id, Number(v));
                  }
                }}
              />
              {showLimitStepper ? (
                <Stepper
                  value={`${dailyLimitMin}m`}
                  onMinus={() => setDailyLimit(app.id, clamp(dailyLimitMin - 5, MIN_LIMIT, MAX_LIMIT))}
                  onPlus={() => setDailyLimit(app.id, clamp(dailyLimitMin + 5, MIN_LIMIT, MAX_LIMIT))}
                />
              ) : null}
            </View>

           
            <Text style={styles.supportive}>
              We'll help you pause once {app.name} stops feeling intentional, and quietly add more friction if you keep coming back.
            </Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glyph: { width: 32, height: 32, borderRadius: 9, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' },
  glyphText: { color: palette.textSoft, fontSize: 17, fontWeight: '800' },
  appName: { color: palette.text, fontSize: 20, fontWeight: '700' },
  field: { gap: 8 },
  fieldLabel: { color: palette.textMute, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'flex-start' },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: palette.text, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  stepValue: { color: palette.text, fontSize: 17, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  meta: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 },
  metaText: { color: palette.textSoft, fontSize: 14 },
  metaStrong: { color: palette.text, fontWeight: '700' },
  supportive: { color: palette.textMute, fontSize: 14, fontStyle: 'italic', lineHeight: 19 },
});
