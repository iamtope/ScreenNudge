import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProtectedTargetsSection } from '@/src/components/ProtectedTargets';
import { PlusUpsellCard } from '@/src/components/PlusUpsellCard';
import { Screen } from '@/src/components/Screen';
import { syncScreenTimeSelectionCount } from '@/src/services/protection';
import { getTodayAttemptCount } from '@/src/services/attempts';
import { EMPTY_STREAK, getStreak, syncStreak, type StreakSummary } from '@/src/services/streak';
import { SCREEN_TIME_PROTECTION_ID, useOnboarding } from '@/src/state/onboarding';
import { useGate } from '@/src/state/access';
import { useSession } from '@/src/state/session';
import { getFirstName } from '@/src/lib/displayName';
import { palette } from '@/src/theme/palette';

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatClock(min: number): string {
  const total = ((Math.round(min) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    usingScreenTime,
    setScreenTimeAppCount,
    bedtimeEnabled,
    bedtimeStart,
    bedtimeEnd,
    getProtection,
  } = useOnboarding();
  const { unlocked: pullPlusUnlocked } = useGate('pullPlus');
  const { profile, user } = useSession();
  const firstName = getFirstName(user, profile);
  const [attemptsToday, setAttemptsToday] = useState(0);
  const [streak, setStreak] = useState<StreakSummary>(EMPTY_STREAK);
  const configuredGoalMin = getProtection(SCREEN_TIME_PROTECTION_ID).dailyLimitMin;

  const todayLabel = React.useMemo(() => {
    const d = new Date();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekdays[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (usingScreenTime) {
        const count = syncScreenTimeSelectionCount();
        if (count > 0) {
          setScreenTimeAppCount(count);
        }
      }
      void getTodayAttemptCount().then(setAttemptsToday);
      void getStreak(configuredGoalMin).then((next) => {
        setStreak(next);
        void syncStreak(next);
      });
    }, [setScreenTimeAppCount, usingScreenTime, configuredGoalMin]),
  );

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.meta}>{todayLabel}</Text>
            <Text style={styles.heading}>
              Hello, <Text style={styles.headingAccent}>{firstName}</Text>.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={palette.textSoft} />
          </Pressable>
        </View>

        <View style={styles.todayRow}>
          <View style={styles.todayCol}>
            <Text style={styles.label}>Attempts today</Text>
            <Text style={styles.attemptCount}>{attemptsToday}</Text>
            <Text style={styles.subtle}>
              {attemptsToday === 0 ? 'None yet' : 'times you reached the pause'}
            </Text>
          </View>

          <View style={styles.todayDivider} />

          <View style={styles.todayCol}>
            <Text style={styles.label}>Goal streak</Text>
            <View style={styles.streakRow}>
              <MaterialCommunityIcons
                name={streak.breachedToday ? 'fire-off' : 'fire'}
                size={22}
                color={streak.breachedToday ? palette.textMute : palette.brass}
              />
              <Text style={styles.attemptCount}>{streak.current}</Text>
            </View>
            <Text style={styles.subtle}>
              {streak.breachedToday
                ? 'Over goal today'
                : streak.goalMin > 0
                  ? `Stay under ${formatMinutes(streak.goalMin)}`
                  : 'days under your goal'}
            </Text>
          </View>
        </View>

        <ProtectedTargetsSection onManage={() => router.push('/pull-plus/add-target')} />

        {pullPlusUnlocked ? (
          <Pressable onPress={() => router.push('/settings')} style={styles.cardPrimary}>
            <Text style={styles.chip}>Wind-Down</Text>
            <Text style={styles.windTitle}>
              {bedtimeEnabled ? `${formatClock(bedtimeStart)} – ${formatClock(bedtimeEnd)}` : 'Set a bedtime'}
            </Text>
            <Text style={styles.subtle}>
              {bedtimeEnabled
                ? 'Guarded apps auto-block overnight'
                : 'Block your apps automatically while you sleep'}
            </Text>
          </Pressable>
        ) : (
          <PlusUpsellCard onPress={() => router.push('/premium')} />
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  settingsBtn: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  meta: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  heading: { color: palette.text, fontSize: 44, fontWeight: '700', marginTop: 6 },
  headingAccent: { color: palette.brass, fontStyle: 'italic' },
  label: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  todayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  todayCol: { flex: 1, gap: 2 },
  todayDivider: { width: 1, alignSelf: 'stretch', backgroundColor: palette.line },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Smaller than the old single-column hero number so two fit side by side.
  attemptCount: { color: palette.text, fontSize: 48, fontWeight: '700', lineHeight: 54 },
  subtle: { color: palette.textSoft, fontSize: 13, lineHeight: 18 },
  green: { color: palette.green, fontSize: 14, marginTop: 4 },
  cardPrimary: { backgroundColor: palette.brassSoft, borderColor: palette.brass, borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 },
  chip: {
    alignSelf: 'flex-start',
    color: palette.brass,
    fontSize: 12,
    backgroundColor: palette.surface,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'uppercase',
  },
  amount: { color: palette.text, fontSize: 34, fontWeight: '700' },
  windTitle: { color: palette.text, fontSize: 23, fontWeight: '700', marginTop: 2 },
});
