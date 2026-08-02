import React from 'react';
import { Platform, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import { palette } from '@/src/theme/palette';

type NativeProps = ViewProps & {
  selection: string;
  maxIcons: number;
};

type Props = {
  selection: string | null;
  count: number;
  fallbackGlyph: string;
};

const MAX_VISIBLE_ICONS = 3;

let cachedNativeView: React.ComponentType<NativeProps> | null | undefined;

function getNativeView(): React.ComponentType<NativeProps> | null {
  if (Platform.OS !== 'ios') return null;
  if (cachedNativeView !== undefined) return cachedNativeView;

  try {
    cachedNativeView = requireNativeViewManager<NativeProps>('GuardedAppIcons');
  } catch {
    cachedNativeView = null;
  }
  return cachedNativeView;
}

export function GuardedAppIcons({ selection, count, fallbackGlyph }: Props) {
  const NativeView = getNativeView();

  if (!NativeView || !selection) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{fallbackGlyph}</Text>
      </View>
    );
  }

  const visibleCount = Math.max(1, Math.min(count, MAX_VISIBLE_ICONS));
  const hiddenCount = Math.max(0, count - visibleCount);

  return (
    <View style={styles.cluster} accessibilityLabel={`${count} guarded app icons`}>
      <NativeView
        pointerEvents="none"
        selection={selection}
        maxIcons={visibleCount}
        style={{ width: visibleCount * 36 - 4, height: 40 }}
      />
      {hiddenCount ? (
        <View style={styles.more}>
          <Text style={styles.moreText}>+{hiddenCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fallback: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: palette.brass,
    fontWeight: '800',
    fontSize: 18,
  },
  more: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.line,
  },
  moreText: {
    color: palette.textMute,
    fontSize: 11,
    fontWeight: '800',
  },
});
