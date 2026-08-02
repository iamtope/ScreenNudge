import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatMinutes, protectionModeName } from '@/src/domain/onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { useGuardLimit } from '@/src/hooks/useGuardLimit';
import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { getScreenTimeSelectionToken } from '@/src/services/protection';
import { palette } from '@/src/theme/palette';
import { GuardedAppIcons } from '@/modules/guarded-app-icons';

type Props = {
  onManage: () => void;
};

export function ProtectedTargetsSection({ onManage }: Props) {
  const router = useRouter();
  const {
    protectionTargets,
    getProtection,
    protectedCount,
    activated,
    usingScreenTime,
  } = useOnboarding();
  const { isPullPlus, atLimit, overLimit } = useGuardLimit();
  const goPlus = () => router.push('/premium');
  const screenTimeSelection = usingScreenTime ? getScreenTimeSelectionToken() : null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Protected</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {protectedCount
                ? `${protectedCount} app${protectedCount === 1 ? '' : 's'} guarded`
                : 'Nothing guarded yet'}
            </Text>
            {protectedCount ? (
              <View style={[styles.planPill, isPullPlus && styles.planPillPlus]}>
                <Text style={[styles.planPillText, isPullPlus && styles.planPillTextPlus]}>
                  {isPullPlus ? 'Unlimited' : `${protectedCount}/${FREE_GUARDED_APP_LIMIT}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {protectedCount ? (
          <Pressable onPress={onManage} style={styles.manage}>
            <Text style={styles.manageText}>Manage</Text>
          </Pressable>
        ) : null}
      </View>

      {protectionTargets.length === 0 ? (
        <>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Choose apps to protect</Text>
            <Text style={styles.emptyBody}>
              Pick the apps that distract you. ScreenNudge intercepts them before mindless scrolling starts.
            </Text>
          </View>
          <Pressable
            onPress={onManage}
            style={styles.primaryCta}
            accessibilityRole="button"
            accessibilityLabel="Protect your first app"
          >
            <MaterialCommunityIcons name="shield-plus" size={20} color={palette.bg} />
            <Text style={styles.primaryCtaText}>Protect your first app</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.list}>
          {protectionTargets.map((target) => {
            const { dailyLimitMin, mode } = getProtection(target.id);
            return (
              <Pressable key={target.id} onPress={onManage} style={styles.row}>
                {usingScreenTime ? (
                  <GuardedAppIcons
                    selection={screenTimeSelection}
                    count={protectedCount}
                    fallbackGlyph={target.glyph}
                  />
                ) : (
                  <View style={styles.glyph}>
                    <Text style={styles.glyphText}>{target.glyph}</Text>
                  </View>
                )}
                <View style={styles.meta}>
                  <Text style={styles.name}>{target.name}</Text>
                  <Text style={styles.limits}>
                    {formatMinutes(dailyLimitMin)} · {protectionModeName(mode)}
                  </Text>
                </View>
                <View style={[styles.badge, !activated && styles.badgePending]}>
                  <Text style={[styles.badgeText, !activated && styles.badgeTextPending]}>
                    {activated ? 'Shield on' : 'Not active'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {overLimit ? (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={palette.brass} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeText}>
              {protectedCount} guarded · over your Free limit of {FREE_GUARDED_APP_LIMIT}. They keep
              working — go unlimited with ScreenNudge+, or trim back to {FREE_GUARDED_APP_LIMIT}.
            </Text>
            <View style={styles.noticeActions}>
              <Pressable onPress={goPlus} hitSlop={6}>
                <Text style={styles.noticeUpgrade}>Upgrade</Text>
              </Pressable>
              <Pressable onPress={onManage} hitSlop={6}>
                <Text style={styles.noticeTrim}>Trim</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : atLimit ? (
        <Pressable onPress={goPlus} style={styles.notice}>
          <MaterialCommunityIcons name="lock-open-outline" size={18} color={palette.brass} />
          <Text style={styles.noticeText}>
            {protectedCount} of {FREE_GUARDED_APP_LIMIT} guarded · <Text style={styles.noticeUpgrade}>upgrade for unlimited</Text>
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  label: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  title: { color: palette.text, fontSize: 24, fontWeight: '700' },
  planPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface2 },
  planPillText: { color: palette.textMute, fontSize: 12, fontWeight: '700' },
  planPillPlus: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  planPillTextPlus: { color: palette.brass },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    borderRadius: 14,
    padding: 12,
  },
  noticeText: { color: palette.textSoft, fontSize: 13, lineHeight: 19, flex: 1 },
  noticeActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  noticeUpgrade: { color: palette.brass, fontSize: 13, fontWeight: '700' },
  noticeTrim: { color: palette.textMute, fontSize: 13, fontWeight: '700' },
  manage: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  manageText: { color: palette.text, fontSize: 14, fontWeight: '600' },
  empty: {
    backgroundColor: palette.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 6,
  },
  emptyTitle: { color: palette.text, fontSize: 17, fontWeight: '700' },
  emptyBody: { color: palette.textSoft, fontSize: 15, lineHeight: 21 },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.brass,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  primaryCtaText: { color: palette.bg, fontSize: 16, fontWeight: '700' },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    padding: 12,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { color: palette.brass, fontWeight: '800', fontSize: 18 },
  meta: { flex: 1, gap: 3 },
  name: { color: palette.text, fontSize: 17, fontWeight: '700' },
  limits: { color: palette.textMute, fontSize: 13 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
  },
  badgeText: { color: palette.brass, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  badgePending: { backgroundColor: palette.surface2, borderColor: palette.line },
  badgeTextPending: { color: palette.textMute },
});
