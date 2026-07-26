import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
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
import { PlanComparison } from '@/src/components/PlanComparison';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { friendlyAccountError } from '@/src/lib/network';
import { palette } from '@/src/theme/palette';

export default function PremiumScreen() {
  const router = useRouter();
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
  const requireAccount = () => {
    router.push({ pathname: '/auth/sign-in', params: { redirect: 'premium' } });
  };

  const onSubscribe = async () => {
    if (!user) {
      setError(null);
      requireAccount();
      return;
    }

    try {
      setBusy(true);
      setError(null);
      // Pass the Supabase user id as Apple's appAccountToken so the App Store
      // Server Notifications webhook can map renew/expire/refund back to this user.
      const purchase = await startPullPlusPurchase(plan, user.id);
      setPullPlus(true);
      void recordSubscription(true, purchase.productId, purchase.plan);
      router.replace('/(tabs)/home');
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
        router.replace('/(tabs)/home');
      } else {
        setError('No active Pull+ subscription found for this Apple ID.');
      }
    } catch (restoreError) {
      setError(
        friendlyAccountError(
          restoreError,
          'Restore failed. Try again on a physical device with a sandbox account.',
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
        <Text style={styles.eyebrow}>Pull+</Text>
        <Text style={styles.title}>
          Guard your <Text style={styles.accent}>attention.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Subscriptions are billed through the App Store.
        </Text>

        <View style={styles.planTabs}>
          <Pressable onPress={() => setPlan('monthly')} style={[styles.plan, plan === 'monthly' && styles.planActive]}>
            <Text style={[styles.planLabel, plan === 'monthly' && styles.planLabelActive]}>
              Monthly · {productsLoading ? '…' : monthlyLabel}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPlan('annual')} style={[styles.plan, plan === 'annual' && styles.planActive]}>
            <Text style={[styles.planLabel, plan === 'annual' && styles.planLabelActive]}>
              Annual · {productsLoading ? '…' : annualLabel}
            </Text>
          </Pressable>
        </View>

        <PlanComparison isPullPlus={isPullPlus} onUpgrade={onSubscribe} showCta={false} />

        {isPullPlus ? (
          <Text style={styles.activeNote}>Pull+ is active on this device.</Text>
        ) : null}

        {!user ? (
          <View style={styles.accountBox}>
            <MaterialCommunityIcons name="account-lock-outline" size={18} color={palette.brass} />
            <Text style={styles.accountText}>
              Sign in before subscribing so Pull+ can be restored after reinstall or on another device.
            </Text>
          </View>
        ) : null}

        {!productsLoading && products.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warning}>
              {productsError ?? 'No products returned from the App Store yet.'}
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
              ? 'Sign in to subscribe'
              : busy
                ? 'Processing…'
                : `Subscribe · ${plan === 'annual' ? annualLabel : monthlyLabel}`}
          </Text>
        </Pressable>

        <Pressable onPress={onRestore} disabled={busy} style={styles.restore}>
          <Text style={styles.restoreLabel}>{user ? 'Restore purchases' : 'Sign in to restore purchases'}</Text>
        </Pressable>

        <Text style={styles.legalBody}>
          Pull+ is an auto-renewable subscription. Your {plan === 'annual' ? annualLabel : monthlyLabel}{' '}
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
  planTabs: { flexDirection: 'row', borderWidth: 1, borderColor: palette.line, borderRadius: 999, padding: 4, gap: 6 },
  plan: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 9 },
  planActive: { backgroundColor: palette.surface2 },
  planLabel: { color: palette.textMute, fontSize: 14, textAlign: 'center' },
  planLabelActive: { color: palette.text },
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
