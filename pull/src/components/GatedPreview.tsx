import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GATE_COPY, type GateReason } from '@/src/state/access';
import { palette } from '@/src/theme/palette';

// RN 0.85's bundled types don't expose StyleSheet.absoluteFillObject; inline it.
const absoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

type Props = {
  reason: GateReason;
  onUnlock: () => void;
  children: React.ReactNode;
  /** card = compact teaser (home). screen = full tab content. */
  variant?: 'card' | 'screen';
};

function LockIcon() {
  return <MaterialCommunityIcons name="lock" size={20} color={palette.brass} />;
}

export function GatedPreview({ reason, onUnlock, children, variant = 'screen' }: Props) {
  const copy = GATE_COPY[reason];
  const isCard = variant === 'card';

  return (
    <Pressable onPress={onUnlock} style={[styles.wrapper, isCard && styles.wrapperCard]}>
      <View style={[styles.preview, isCard && styles.previewCard]} pointerEvents="none">
        {children}
      </View>

      <BlurView
        intensity={Platform.OS === 'ios' ? (isCard ? 28 : 22) : 50}
        tint="dark"
        style={styles.blur}
        {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
      />

      <View style={[styles.scrim, isCard ? styles.scrimCard : styles.scrimScreen]} pointerEvents="none" />

      <View style={[styles.overlay, isCard && styles.overlayCard]}>
        <View style={styles.lockBadge}>
          <LockIcon />
        </View>
        <Text style={[styles.title, isCard && styles.titleCard]}>{copy.title}</Text>
        <Text style={[styles.subtitle, isCard && styles.subtitleCard]}>{copy.subtitle}</Text>
        <Text style={styles.cta}>{copy.cta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: palette.bg,
  },
  wrapperCard: {
    flex: undefined,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    minHeight: 172,
  },
  preview: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  previewCard: {
    flex: undefined,
    padding: 14,
    gap: 4,
  },
  blur: {
    ...absoluteFill,
  },
  scrim: {
    ...absoluteFill,
  },
  scrimScreen: {
    backgroundColor: 'rgba(5, 5, 9, 0.45)',
  },
  scrimCard: {
    backgroundColor: 'rgba(5, 5, 9, 0.35)',
  },
  overlay: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
    gap: 10,
  },
  overlayCard: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 8,
  },
  lockBadge: {
    width: 44,
    height: 44,
    borderRadius: 99,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  lockIcon: { fontSize: 20 },
  title: { color: palette.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  titleCard: { fontSize: 19, paddingHorizontal: 4 },
  subtitle: {
    color: palette.textSoft,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 280,
    paddingHorizontal: 4,
  },
  subtitleCard: { fontSize: 14, lineHeight: 20, maxWidth: 260 },
  cta: {
    color: palette.brass,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

/** Wrap screen content — shows preview blurred when locked. */
export function GatedScreen({
  requirement,
  unlocked,
  blockedBy,
  onUnlock,
  children,
}: {
  requirement: GateReason;
  unlocked: boolean;
  blockedBy: GateReason | null;
  onUnlock: () => void;
  children: React.ReactNode;
}) {
  if (unlocked) {
    return <>{children}</>;
  }
  return (
    <GatedPreview reason={blockedBy ?? requirement} onUnlock={onUnlock} variant="screen">
      {children}
    </GatedPreview>
  );
}
