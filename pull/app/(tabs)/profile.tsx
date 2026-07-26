import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { useSession } from '@/src/state/session';
import { useAchievements } from '@/src/state/achievements';
import { ACHIEVEMENTS } from '@/src/domain/achievements';
import { getAttemptEvents, type AttemptEvent } from '@/src/services/attempts';
import { getFirstName } from '@/src/lib/displayName';
import { palette } from '@/src/theme/palette';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive days (up to today) with at least one resist. */
function computeStreak(resistDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!resistDates.has(dateKey(cursor))) {
    // Today might not have one yet — don't break the streak for that.
    cursor.setDate(cursor.getDate() - 1);
  }
  while (resistDates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function memberSince(createdAt?: string): string {
  if (!createdAt) {
    return '';
  }
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return `Member since ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user } = useSession();
  const { unlocked, metrics, evaluate } = useAchievements();
  const [events, setEvents] = useState<AttemptEvent[]>([]);

  // Reload on focus so freshly-recorded resists/streak show on return.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getAttemptEvents(365).then((loaded) => {
        if (active) {
          setEvents(loaded);
        }
      });
      void evaluate();
      return () => {
        active = false;
      };
    }, [evaluate]),
  );

  const stats = useMemo(() => {
    const attempts = events.filter((e) => e.outcome === 'attempt').length;
    const resists = events.filter((e) => e.outcome === 'comeback').length;
    const resistRate = attempts > 0 ? Math.round((resists / attempts) * 100) : 0;
    const resistDates = new Set(events.filter((e) => e.outcome === 'comeback').map((e) => e.date));
    return { attempts, resists, resistRate, streak: computeStreak(resistDates) };
  }, [events]);

  const name = getFirstName(user, profile) || profile?.displayName || 'You';
  const initial = (profile?.initial ?? name.charAt(0) ?? 'P').toUpperCase();
  const since = memberSince(user?.created_at);

  return (
    <Screen edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Profile</Text>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.initial}>{initial}</Text></View>
          <View>
            <Text style={styles.name}>{name}</Text>
            {since ? <Text style={styles.meta}>{since}</Text> : null}
          </View>
        </View>
        <View style={styles.grid}>
          <Stat label="Attempts" value={String(stats.attempts)} />
          <Stat label="Resisted" value={String(stats.resists)} />
          <Stat label="Resist rate" value={`${stats.resistRate}%`} />
          <Stat label="Streak" value={`${stats.streak}d`} />
        </View>

        <Text style={styles.sectionLabel}>Achievements</Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((a) => {
            const earned = Boolean(unlocked[a.id]);
            const value = metrics[a.metric] ?? 0;
            return (
              <View key={a.id} style={[styles.badge, earned ? styles.badgeEarned : styles.badgeLocked]}>
                <MaterialCommunityIcons
                  name={a.icon}
                  size={26}
                  color={earned ? palette.brass : palette.textMute}
                />
                <Text style={styles.badgeTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.badgeMeta} numberOfLines={1}>
                  {earned ? 'Unlocked' : `${Math.min(value, a.threshold)}/${a.threshold}`}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable onPress={() => router.push('/premium')} style={styles.cta}>
          <Text style={styles.ctaTitle}>Become Pull+</Text>
          <Text style={styles.meta}>Deeper insights · advanced controls</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24, gap: 12 },
  eyebrow: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  avatar: { width: 70, height: 70, borderRadius: 99, backgroundColor: palette.brass, alignItems: 'center', justifyContent: 'center' },
  initial: { color: palette.bg, fontWeight: '800', fontSize: 30 },
  name: { color: palette.text, fontSize: 38, fontWeight: '700' },
  meta: { color: palette.textMute, fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', borderWidth: 1, borderColor: palette.line, borderRadius: 14, backgroundColor: palette.surface, padding: 12 },
  statLabel: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase' },
  statValue: { color: palette.text, fontSize: 32, fontWeight: '700' },
  cta: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, backgroundColor: palette.surface, padding: 14 },
  ctaTitle: { color: palette.text, fontSize: 17, fontWeight: '700' },
  sectionLabel: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 8 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31%', borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 4 },
  badgeEarned: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  badgeLocked: { borderColor: palette.line, backgroundColor: palette.surface, opacity: 0.5 },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { opacity: 0.6 },
  badgeTitle: { color: palette.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  badgeMeta: { color: palette.textMute, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
});
