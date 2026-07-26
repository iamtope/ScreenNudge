import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProtectedTargetsSection } from '@/src/components/ProtectedTargets';
import { PlanComparison } from '@/src/components/PlanComparison';
import { Screen } from '@/src/components/Screen';
import { syncScreenTimeSelectionCount } from '@/src/services/protection';
import { getTodayAttemptCount } from '@/src/services/attempts';
import { useOnboarding } from '@/src/state/onboarding';
import { useGate } from '@/src/state/access';
import { useSession } from '@/src/state/session';
import { getFirstName } from '@/src/lib/displayName';
import { palette } from '@/src/theme/palette';

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
  const { protectionTargets, usingScreenTime, setScreenTimeAppCount, getProtection, bedtimeEnabled, bedtimeStart, bedtimeEnd } = useOnboarding();
  const { unlocked: pullPlusUnlocked } = useGate('pullPlus');
  const { profile, user } = useSession();
  const firstName = getFirstName(user, profile);
  const [attemptsToday, setAttemptsToday] = useState(0);

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
    }, [setScreenTimeAppCount, usingScreenTime]),
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

        <View>
          <Text style={styles.label}>Attempts today</Text>
          <View style={styles.attemptRow}>
            <Text style={styles.attemptCount}>{attemptsToday}</Text>
            <View>
              <Text style={styles.subtle}>
                {attemptsToday === 0
                  ? 'No guarded-app attempts yet'
                  : 'times you reached the pause'}
              </Text>
            </View>
          </View>
        </View>

        <ProtectedTargetsSection onManage={() => router.push('/pull-plus/add-target')} />

        {protectionTargets.length > 0 ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/intercept/[app]',
                params: { app: 'app', mode: getProtection(protectionTargets[0].id).mode },
              })
            }
            style={styles.unlockBtn}
          >
            <Text style={styles.unlockLabel}>A guarded app is blocked? Take the pause to unlock</Text>
          </Pressable>
        ) : null}

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
          <PlanComparison isPullPlus={false} onUpgrade={() => router.push('/premium')} />
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
  attemptRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 8 },
  attemptCount: { color: palette.text, fontSize: 76, fontWeight: '700', lineHeight: 80 },
  subtle: { color: palette.textSoft, fontSize: 14 },
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
  unlockBtn: { borderWidth: 1, borderColor: palette.brass, backgroundColor: palette.brassSoft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' },
  unlockLabel: { color: palette.brass, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
