import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  isScreenTimeAvailable,
  getAppPickerComponentPersisted,
  requestOnboardingPermissions,
} from '@/src/services/screenTime';
import { PULL_SELECTION_ID, syncScreenTimeSelectionCount } from '@/src/services/protection';
import { useOnboarding } from '@/src/state/onboarding';
import { useGuardLimit } from '@/src/hooks/useGuardLimit';
import { FREE_GUARDED_APP_LIMIT } from '@/src/domain/plan';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '@/src/theme/palette';

export type AppSelectionPhase = 'intro' | 'requesting' | 'native' | 'unavailable';

export function useAppSelection() {
  const {
    screenTimeAppCount,
    setScreenTimeAppCount,
    usingScreenTime,
    protectedCount,
  } = useOnboarding();

  const { canAddMore, overLimit } = useGuardLimit();

  const [phase, setPhase] = useState<AppSelectionPhase>(
    usingScreenTime ? 'native' : 'intro',
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const countBeforePickerRef = useRef(0);

  const AppPicker = getAppPickerComponentPersisted();

  const openPicker = useCallback(() => {
    countBeforePickerRef.current =
      syncScreenTimeSelectionCount() || screenTimeAppCount || protectedCount;
    setPickerVisible(true);
  }, [screenTimeAppCount, protectedCount]);

  const findApps = async () => {
    setPhase('requesting');
    const perms = await requestOnboardingPermissions();
    if (isScreenTimeAvailable() && perms.screenTime === 'approved') {
      setPhase('native');
      openPicker();
    } else {
      setPhase('unavailable');
    }
  };

  const handleNativeSelection = (event: {
    nativeEvent?: { applicationCount?: number };
  }) => {
    const count = event?.nativeEvent?.applicationCount ?? 0;
    if (count > 0) {
      setScreenTimeAppCount(count);
    }
  };

  const handlePickerDismiss = useCallback(() => {
    setPickerVisible(false);
    const persisted = syncScreenTimeSelectionCount();
    if (persisted > 0) {
      setScreenTimeAppCount(persisted);
      return;
    }
    if (countBeforePickerRef.current > 0) {
      setScreenTimeAppCount(countBeforePickerRef.current);
      return;
    }
    setScreenTimeAppCount(0);
  }, [setScreenTimeAppCount]);

  const canContinue = protectedCount > 0;

  return {
    phase,
    pickerVisible,
    setPickerVisible: openPicker,
    AppPicker,
    screenTimeAppCount,
    protectedCount,
    findApps,
    handleNativeSelection,
    handlePickerDismiss,
    canContinue,
    limitReached: !canAddMore,
    overFreeLimit: overLimit,
  };
}

type BodyProps = ReturnType<typeof useAppSelection>;

export function AppSelectionBody(props: BodyProps & { onUpgrade: () => void }) {
  const {
    phase,
    pickerVisible,
    setPickerVisible,
    AppPicker,
    screenTimeAppCount,
    findApps,
    handleNativeSelection,
    handlePickerDismiss,
    limitReached,
    onUpgrade,
  } = props;

  return (
    <>
      {AppPicker && pickerVisible ? (
        <AppPicker
          style={styles.pickerAnchor}
          familyActivitySelectionId={PULL_SELECTION_ID}
          includeEntireCategory
          onSelectionChange={handleNativeSelection}
          onDismissRequest={handlePickerDismiss}
        />
      ) : null}

      {limitReached && phase === 'native' ? (
        <Pressable onPress={onUpgrade} style={styles.upsell}>
          <MaterialCommunityIcons name="lock-open-outline" size={18} color={palette.brass} />
          <Text style={styles.upsellText}>
            ScreenNudge Free guards {FREE_GUARDED_APP_LIMIT} apps. <Text style={styles.upsellLink}>Upgrade to premium for unlimited.</Text>
          </Text>
        </Pressable>
      ) : null}

      {phase === 'intro' ? (
        <View style={styles.center}>
          <View style={styles.radar}>
            <View style={styles.radarRing} />
            <View style={styles.radarCore} />
          </View>
          <Text style={styles.centerText}>
            Tap “Find My Apps” to open Apple’s Screen Time picker and choose the apps ScreenNudge should protect. Nothing leaves your device.
          </Text>
        </View>
      ) : null}

      {phase === 'requesting' ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.brass} size="large" />
          <Text style={styles.centerText}>Requesting Screen Time and notification access…</Text>
        </View>
      ) : null}

      {phase === 'native' ? (
        <View style={styles.center}>
          <View style={styles.nativeCount}>
            <Text style={styles.nativeCountValue}>{screenTimeAppCount}</Text>
            <Text style={styles.nativeCountLabel}>apps selected</Text>
          </View>
          <Text style={styles.centerText}>
            {screenTimeAppCount
              ? 'These apps are protected by ScreenNudge via Screen Time.'
              : 'Open the Screen Time picker to choose the apps you want to protect.'}
          </Text>
        </View>
      ) : null}

      {phase === 'unavailable' ? (
        <View style={styles.center}>
          <View style={styles.unavailableIcon}>
            <MaterialCommunityIcons name="shield-alert-outline" size={42} color={palette.brass} />
          </View>
          <Text style={styles.centerText}>
            ScreenNudge needs Screen Time access to protect apps on this device. Allow Screen Time when prompted, then try again.
          </Text>
          <Pressable onPress={() => void findApps()} style={styles.retry}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

/**
 * The secondary action for the selection step, or null when there isn't one.
 * Over the free limit this is the upgrade path; otherwise it re-opens the picker.
 */
export function appSelectionSecondaryAction(
  selection: BodyProps,
  onUpgrade: () => void,
): { label: string; onPress: () => void } | null {
  const { phase, protectedCount, setPickerVisible, overFreeLimit } = selection;

  if (phase !== 'native') {
    return null;
  }
  if (overFreeLimit) {
    return { label: 'Upgrade for unlimited apps', onPress: onUpgrade };
  }
  if (protectedCount > 0) {
    return { label: 'Change selection', onPress: () => setPickerVisible() };
  }
  return null;
}

export function appSelectionPrimaryAction(
  selection: BodyProps,
  onContinue: () => void,
): { label: string; onPress: () => void; disabled: boolean } {
  const { phase, protectedCount, setPickerVisible, findApps, overFreeLimit } = selection;

  if (phase === 'native') {
    if (overFreeLimit) {
      // Screen Time hands back only a count, never the identities, so we cannot
      // trim the selection down to the free limit ourselves — only the user can,
      // in Apple's picker. Keep that the primary way forward so upgrading stays a
      // choice rather than the only exit.
      return { label: 'Change selection', onPress: () => setPickerVisible(), disabled: false };
    }
    return {
      label: protectedCount
        ? `Protect ${protectedCount} app${protectedCount === 1 ? '' : 's'}`
        : 'Pick apps to continue',
      // onPress:  onContinue,
      onPress: protectedCount ? onContinue : () => setPickerVisible(),
      disabled: false,
    };
  }
  if (phase === 'unavailable') {
    return { label: 'Try Screen Time again', onPress: findApps, disabled: false };
  }
  if (phase === 'requesting') {
    return {
      label: 'Requesting access…',
      onPress: () => {},
      disabled: true,
    };
  }
  return { label: 'Find My Apps', onPress: findApps, disabled: false };
}

const styles = StyleSheet.create({
  pickerAnchor: { width: 1, height: 1, position: 'absolute' },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  upsellText: { color: palette.textSoft, fontSize: 14, lineHeight: 19, flex: 1 },
  upsellLink: { color: palette.brass, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 18 },
  centerText: { color: palette.textSoft, fontSize: 16, textAlign: 'center', maxWidth: 290, lineHeight: 22 },
  radar: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  radarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: palette.brass,
    opacity: 0.5,
  },
  radarCore: {
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
  },
  nativeCount: {
    width: 150,
    height: 150,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.brassSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeCountValue: { color: palette.text, fontSize: 58, fontWeight: '800', lineHeight: 62 },
  nativeCountLabel: { color: palette.textMute, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.4 },
  unavailableIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brassSoft,
    borderColor: palette.line,
    borderWidth: 1,
  },
  retry: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: palette.brass,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryLabel: { color: palette.brass, fontWeight: '700' },
});
