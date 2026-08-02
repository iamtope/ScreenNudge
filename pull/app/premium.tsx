import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import {
  formatSubscriptionPrice,
  PULL_PLUS_SKU_ANNUAL,
  PULL_PLUS_SKU_MONTHLY,
  restorePullPlusPurchases,
  startPullPlusPurchase,
  type PullPlan,
} from '@/src/services/payments';
import { useBilling } from '@/src/state/billing';
import { useAccess } from '@/src/state/access';
import { useSession } from '@/src/state/session';
import { recordSubscription } from '@/src/services/subscription';
import { PLUS_FEATURES } from '@/src/domain/plan';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { friendlyAccountError } from '@/src/lib/network';
import { palette } from '@/src/theme/palette';

export default function PremiumScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setPullPlus, isPullPlus } = useAccess();
  const { user } = useSession();
  const { products, productsLoading, productsError, reloadProducts, refreshEntitlement } = useBilling();
  const [plan, setPlan] = useState<PullPlan>('annual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyProduct = useMemo(
    () => products.find((p) => p.id === PULL_PLUS_SKU_MONTHLY),
    [products],
  );
  const annualProduct = useMemo(
    () => products.find((p) => p.id === PULL_PLUS_SKU_ANNUAL),
    [products],
  );

  const monthlyLabel = formatSubscriptionPrice(monthlyProduct, '$0.99/mo');
  const annualLabel = formatSubscriptionPrice(annualProduct, '$8.99/yr');
  const selectedProduct = plan === 'annual' ? annualProduct : monthlyProduct;
  const storeReady = !productsLoading && Boolean(selectedProduct);

  // Computed from the real store prices rather than hardcoded, so the badge cannot
  // drift from what the user is actually charged. Hidden unless both prices load.
  const annualSaving = useMemo(() => {
    const monthly = monthlyProduct?.price;
    const annual = annualProduct?.price;
    if (!monthly || !annual || monthly <= 0) {
      return null;
    }
    const yearAtMonthly = monthly * 12;
    if (annual >= yearAtMonthly) {
      return null;
    }
    return Math.round(((yearAtMonthly - annual) / yearAtMonthly) * 100);
  }, [monthlyProduct?.price, annualProduct?.price]);

  const annualPerMonth = useMemo(() => {
    const annual = annualProduct?.price;
    const currency = annualProduct?.currency;
    if (!annual || !currency) {
      return null;
    }
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
        annual / 12,
      );
    } catch {
      return null;
    }
  }, [annualProduct?.price, annualProduct?.currency]);
  const requireAccount = () => {
    router.push({
      pathname: '/auth/sign-in',
      params: { redirect: 'premium', ...(returnTo ? { returnTo } : {}) },
    });
  };

  /**
   * Where to go once ScreenNudge+ is unlocked. Reached mid-onboarding this has to
   * resume the flow — dropping the user on Home would skip `activate`, the only
   * step that actually turns protection on.
   */
  const leaveAfterUnlock = useCallback(() => {
    if (returnTo === 'onboarding-select-apps') {
      router.replace('/onboarding/select-apps');
      return;
    }
    router.replace('/(tabs)/home');
  }, [returnTo, router]);

  const onSubscribe = async () => {
    if (!user) {
      setError(null);
      requireAccount();
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const purchase = await startPullPlusPurchase(plan, user.id);
      setPullPlus(true);
      void recordSubscription(true, purchase.productId, purchase.plan);
      leaveAfterUnlock();
    } catch (purchaseError) {
      const message =
        purchaseError instanceof Error ? purchaseError.message : 'Purchase could not complete.';
      if (!message.toLowerCase().includes('cancel')) {
        setError(friendlyAccountError(purchaseError, 'Purchase could not complete.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (!user) {
      setError(null);
      requireAccount();
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const restored = await restorePullPlusPurchases();
      if (restored) {
        setPullPlus(true);
        await refreshEntitlement();
        leaveAfterUnlock();
      } else {
        setError('No active ScreenNudge+ subscription found for this Apple ID.');
      }
    } catch (restoreError) {
      setError(
        friendlyAccountError(
          restoreError,
          'Restore failed. Check your App Store account and try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={16} color={palette.textMute} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>ScreenNudge+</Text>
        <Text style={styles.title}>
          Guard your <Text style={styles.accent}>attention.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Everything in ScreenNudge, without the ceiling.
        </Text>

        <View style={styles.benefits}>
          {PLUS_FEATURES.map((feature) => (
            <View key={feature.label} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <MaterialCommunityIcons name={feature.icon} size={20} color={palette.brass} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{feature.label}</Text>
                <Text style={styles.benefitBlurb}>{feature.blurb}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planCards}>
          <Pressable
            onPress={() => setPlan('annual')}
            style={[styles.planCard, plan === 'annual' && styles.planCardActive]}
          >
            {annualSaving !== null ? (
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE {annualSaving}%</Text>
              </View>
            ) : null}
            <Text style={[styles.planName, plan === 'annual' && styles.planNameActive]}>Yearly</Text>
            <Text style={styles.planPrice}>{productsLoading ? '…' : annualLabel}</Text>
            <Text style={styles.planNote}>
              {annualPerMonth ? `${annualPerMonth} a month` : 'Billed once a year'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPlan('monthly')}
            style={[styles.planCard, plan === 'monthly' && styles.planCardActive]}
          >
            <Text style={[styles.planName, plan === 'monthly' && styles.planNameActive]}>Monthly</Text>
            <Text style={styles.planPrice}>{productsLoading ? '…' : monthlyLabel}</Text>
            <Text style={styles.planNote}>Cancel anytime</Text>
          </Pressable>
        </View>

        {isPullPlus ? (
          <Text style={styles.activeNote}>ScreenNudge+ is active on this device.</Text>
        ) : null}

        {!user ? (
          <View style={styles.accountBox}>
            <MaterialCommunityIcons name="account-lock-outline" size={18} color={palette.brass} />
            <Text style={styles.accountText}>
              Sign in before subscribing so ScreenNudge+ can be restored after reinstall or on another device.
            </Text>
          </View>
        ) : null}

        {!productsLoading && products.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warning}>
              {productsError ?? 'ScreenNudge+ is temporarily unavailable from the App Store.'}
            </Text>
            <Pressable onPress={() => void reloadProducts()} disabled={busy} style={styles.reload}>
              <Text style={styles.reloadLabel}>Reload products</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onSubscribe}
          disabled={busy || (user ? !storeReady : false)}
          style={[styles.cta, (busy || (user ? !storeReady : false)) && styles.disabled]}
        >
          <Text style={styles.ctaLabel}>
            {!user
              ? 'Sign in to unlock'
              : busy
                ? 'Processing…'
                : `Unlock ScreenNudge+ · ${plan === 'annual' ? annualLabel : monthlyLabel}`}
          </Text>
        </Pressable>

        <Pressable onPress={onRestore} disabled={busy} style={styles.restore}>
          <Text style={styles.restoreLabel}>{user ? 'Restore purchases' : 'Sign in to restore purchases'}</Text>
        </Pressable>

        <Text style={styles.legalBody}>
          ScreenNudge+ is an auto-renewable subscription. Your {plan === 'annual' ? annualLabel : monthlyLabel}{' '}
          subscription renews automatically each {plan === 'annual' ? 'year' : 'month'} unless cancelled
          at least 24 hours before the end of the current period. Payment is charged to your Apple ID;
          manage or cancel anytime in your App Store account settings.
        </Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 10 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingLeft: 8, paddingRight: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface },
  backText: { color: palette.textMute, fontSize: 14 },
  eyebrow: { color: palette.brass, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, marginTop: 6 },
  title: { color: palette.text, fontSize: 46, fontWeight: '700', lineHeight: 49 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  subtitle: { color: palette.textSoft, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  benefits: { gap: 14, marginTop: 4, marginBottom: 6 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { color: palette.text, fontSize: 16, fontWeight: '700' },
  benefitBlurb: { color: palette.textSoft, fontSize: 13, lineHeight: 19, marginTop: 2 },
  planCards: { flexDirection: 'row', gap: 10, marginTop: 4 },
  planCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 2,
    alignItems: 'center',
  },
  planCardActive: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  saveBadge: {
    position: 'absolute',
    top: -9,
    backgroundColor: palette.brass,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  saveBadgeText: { color: palette.bg, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  planName: {
    color: palette.textMute,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  planNameActive: { color: palette.brass },
  planPrice: { color: palette.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  planNote: { color: palette.textMute, fontSize: 12 },
  featureList: { marginTop: 8, gap: 8 },
  feature: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tick: { color: palette.brass, fontWeight: '800' },
  featureText: { color: palette.textSoft, fontSize: 15, flex: 1 },
  activeNote: { color: palette.green, fontSize: 14 },
  accountBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 12, padding: 12 },
  accountText: { color: palette.textSoft, fontSize: 14, lineHeight: 20, flex: 1 },
  warningBox: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 12, padding: 12, gap: 10 },
  warning: { color: palette.brass, fontSize: 14, lineHeight: 20 },
  reload: { alignSelf: 'flex-start', borderRadius: 99, borderWidth: 1, borderColor: palette.brass, paddingHorizontal: 14, paddingVertical: 8 },
  reloadLabel: { color: palette.brass, fontSize: 14, fontWeight: '700' },
  error: { color: '#ff8ea3', fontSize: 14, marginTop: 4 },
  cta: { marginTop: 12, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: palette.brass },
  ctaLabel: { color: palette.bg, fontWeight: '700' },
  restore: { paddingVertical: 12, alignItems: 'center' },
  restoreLabel: { color: palette.textMute, fontSize: 14 },
  disabled: { opacity: 0.6 },
  legalBody: { color: palette.textMute, fontSize: 13, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  legalLink: { color: palette.textSoft, fontSize: 14, textDecorationLine: 'underline' },
  legalDot: { color: palette.textMute, fontSize: 14 },
});
