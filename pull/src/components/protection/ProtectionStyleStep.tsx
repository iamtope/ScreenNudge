import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { protectionModes, type ProtectionMode, DEFAULT_PROTECTION_MODE } from '@/src/domain/onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { palette } from '@/src/theme/palette';

export function ProtectionStyleStep() {
  const { protectionTargets, getProtection, setMode } = useOnboarding();

  const initial = protectionTargets.length
    ? getProtection(protectionTargets[0].id).mode
    : DEFAULT_PROTECTION_MODE;
  const [chosen, setChosen] = useState<ProtectionMode>(initial);

  const apply = (mode: ProtectionMode) => {
    setChosen(mode);
    protectionTargets.forEach((app) => setMode(app.id, mode));
  };

  return (
    <>
      {protectionModes.map((mode) => {
        const active = chosen === mode.id;
        return (
          <Pressable
            key={mode.id}
            onPress={() => apply(mode.id)}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={styles.head}>
              <Text style={[styles.name, active && styles.nameActive]}>{mode.name}</Text>
              {mode.recommended ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Recommended</Text>
                </View>
              ) : null}
              <View style={[styles.radio, active && styles.radioActive]} />
            </View>
            <Text style={styles.tagline}>{mode.tagline}</Text>
            <View style={styles.tags}>
              {mode.includes.map((item) => (
                <View key={item} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.bestFor}>Best for: {mode.bestFor.join(' · ')}</Text>
          </Pressable>
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
    gap: 10,
  },
  cardActive: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: palette.textSoft, fontSize: 22, fontWeight: '700' },
  nameActive: { color: palette.text },
  badge: { backgroundColor: palette.brass, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: palette.bg, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  radio: { marginLeft: 'auto', width: 20, height: 20, borderRadius: 99, borderWidth: 1, borderColor: palette.textMute },
  radioActive: { backgroundColor: palette.brass, borderColor: palette.brass },
  tagline: { color: palette.textSoft, fontSize: 15, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: palette.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: palette.textSoft, fontSize: 13 },
  bestFor: { color: palette.textMute, fontSize: 13, lineHeight: 18 },
});
