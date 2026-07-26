import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PLUS_FEATURES } from '@/src/domain/plan';
import { palette } from '@/src/theme/palette';

type Props = {
  isPullPlus: boolean;
  onUpgrade: () => void;
  /** Show the built-in Upgrade button (hide it where the screen has its own CTA). */
  showCta?: boolean;
};

function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === '') {
    return <Text style={styles.dash}>—</Text>;
  }
  if (value === 'Yes') {
    return <MaterialCommunityIcons name="check" size={16} color={highlight ? palette.brass : palette.textMute} />;
  }
  return (
    <Text
      style={[styles.cellText, highlight ? styles.cellTextPlus : null]}
      numberOfLines={2}
    >
      {value}
    </Text>
  );
}

/** Free vs Pull+ matrix, shared by Home, the paywall, and onboarding. */
export function PlanComparison({ isPullPlus, onUpgrade, showCta = true }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Pull+</Text>
      <Text style={styles.title}>
        More with <Text style={styles.accent}>Pull+</Text>
      </Text>

      <View style={styles.colHead}>
        <View style={{ flex: 1 }} />
        <Text style={[styles.colLabel, !isPullPlus && styles.colCurrent]}>Free</Text>
        <Text style={[styles.colLabel, styles.colPlus]}>Pull+</Text>
      </View>

      {PLUS_FEATURES.map((f) => (
        <View key={f.label} style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name={f.icon} size={18} color={palette.brass} />
            <Text style={styles.rowLabel} numberOfLines={2}>
              {f.label}
            </Text>
          </View>
          <View style={styles.cell}>
            <Cell value={f.free} />
          </View>
          <View style={[styles.cell, styles.cellPlus]}>
            <Cell value={f.plus} highlight />
          </View>
        </View>
      ))}

      {isPullPlus ? (
        <Text style={styles.activeNote}>You’re on Pull+ — everything unlocked.</Text>
      ) : showCta ? (
        <Pressable onPress={onUpgrade} style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>Upgrade to Pull+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const CELL_W = 80;

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  eyebrow: { color: palette.brass, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  colHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  colLabel: { width: CELL_W, textAlign: 'center', color: palette.textMute, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  colCurrent: { color: palette.textSoft },
  colPlus: { color: palette.brass },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  rowLabel: { color: palette.text, fontSize: 14, fontWeight: '600', flex: 1 },
  cell: { width: CELL_W, alignItems: 'center', justifyContent: 'center' },
  cellPlus: { backgroundColor: palette.brassSoft, borderRadius: 8, alignSelf: 'stretch' },
  cellText: { color: palette.textMute, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cellTextPlus: { color: palette.brass, fontWeight: '700' },
  dash: { color: palette.textMute, fontSize: 14 },
  cta: { marginTop: 14, backgroundColor: palette.brass, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: palette.bg, fontSize: 16, fontWeight: '700' },
  activeNote: { color: palette.green, fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
});
