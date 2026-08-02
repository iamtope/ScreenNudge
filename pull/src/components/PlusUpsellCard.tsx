import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { useGuardLimit } from '@/src/hooks/useGuardLimit';
import { useOnboarding } from '@/src/state/onboarding';
import { palette } from '@/src/theme/palette';

type Hook = { headline: string; sub: string };

/**
 * The pitch changes with what the user is actually bumping into. A generic
 * "go premium" reads as noise on the home screen; "you are guarding 4 apps and Free
 * covers 2" is the same offer at the moment it means something.
 */
function upsellHook(params: {
  overLimit: boolean;
  atLimit: boolean;
  protectedCount: number;
  bedtimeEnabled: boolean;
}): Hook {
  if (params.overLimit) {
    return {
      headline: `${params.protectedCount} apps guarded, ${FREE_GUARDED_APP_LIMIT} covered`,
      sub: `Free protects ${FREE_GUARDED_APP_LIMIT}. Go unlimited and keep the rest guarded too.`,
    };
  }
  if (params.atLimit) {
    return {
      headline: 'Both free slots are full',
      sub: 'Unlock unlimited apps, and guard everything that pulls at you.',
    };
  }
  if (!params.bedtimeEnabled) {
    return {
      headline: 'Stop losing the night',
      sub: 'Wind-Down blocks your apps at bedtime, automatically, every night.',
    };
  }
  return {
    headline: 'See the time you won back',
    sub: 'Deeper insights, custom pauses, and every app guarded.',
  };
}

export function PlusUpsellCard({ onPress }: { onPress: () => void }) {
  const { overLimit, atLimit, count } = useGuardLimit();
  const { bedtimeEnabled } = useOnboarding();
  const hook = upsellHook({
    overLimit,
    atLimit,
    protectedCount: count,
    bedtimeEnabled,
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`ScreenNudge Plus. ${hook.headline}. ${hook.sub}`}
    >
      <View style={styles.top}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="shield-star" size={20} color={palette.brass} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ScreenNudge+</Text>
          <Text style={styles.headline}>{hook.headline}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={palette.brass} />
      </View>

      <Text style={styles.sub}>{hook.sub}</Text>

      <View style={styles.pills}>
        {['Unlimited apps', 'Wind-Down', 'Insights'].map((pill) => (
          <View key={pill} style={styles.pill}>
            <Text style={styles.pillText}>{pill}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: palette.brass,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  headline: { color: palette.text, fontSize: 19, fontWeight: '700', marginTop: 2 },
  sub: { color: palette.textSoft, fontSize: 14, lineHeight: 20 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { color: palette.textSoft, fontSize: 12, fontWeight: '600' },
});
