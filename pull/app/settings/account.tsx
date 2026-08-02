import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import {
  SettingsActionRow,
  SettingsInfoRow,
  SettingsScaffold,
  SettingsSection,
} from '@/src/components/settings/SettingsScaffold';
import { deleteAccount, signOut } from '@/src/services/auth';
import { useSession } from '@/src/state/session';
import { useOnboarding } from '@/src/state/onboarding';
import { useAccess } from '@/src/state/access';
import { clearProtectionState } from '@/src/services/protection';
import { clearProtectionSnapshot } from '@/src/services/protectionStorage';
import { clearAttempts, syncLocalAttemptEvents } from '@/src/services/attempts';
import { clearCachedCircle } from '@/src/services/circle';
import { friendlyAccountError, withTimeoutFallback } from '@/src/lib/network';

// Flushing queued events walks up to 500 of them one RPC at a time, so it can
// outlive any patience when the connection is slow or gone. Give it a moment to
// land, then sign out regardless.
const ATTEMPT_FLUSH_TIMEOUT_MS = 3_000;

const PROVIDER_LABELS: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
};

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, profile } = useSession();
  const { reset: resetOnboarding } = useOnboarding();
  const { setPullPlus } = useAccess();
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Two providers only share an account when they hand back the same verified
  // email, so showing both makes a mismatch (Apple's Hide My Email relay, most
  // often) visible instead of looking like lost data.
  const providers = (user?.identities ?? [])
    .map((identity) => identity.provider)
    .filter((provider, index, all) => all.indexOf(provider) === index);
  const signInMethods = providers.length
    ? providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(' · ')
    : '-';

  /**
   * Signing out ends the session, nothing more.
   *
   * Protection is device-local and works without an account, so tearing it down
   * here would silently unguard the user's apps and push them back through
   * onboarding on the next sign-in. Only account-scoped things are cleared:
   * the entitlement, the cached circle, and local usage events — those last ones
   * because they sync, so they come back on sign-in and would otherwise leak into
   * the next account to use this device.
   */
  const clearAccountData = async (userId?: string) => {
    setPullPlus(false);
    await Promise.all([
      clearAttempts(),
      userId ? clearCachedCircle(userId) : Promise.resolve(),
    ]);
  };

  /** Deleting the account really does mean wiping the device too. */
  const resetDeviceData = async (userId?: string) => {
    clearProtectionState();
    resetOnboarding();
    await Promise.all([clearProtectionSnapshot(), clearAccountData(userId)]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, your circle, focus history, and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            const userId = user?.id;
            setDeleting(true);
            try {
              await deleteAccount();
              await resetDeviceData(userId);
              router.replace('/');
            } catch (err) {
              setDeleting(false);
              Alert.alert('Delete failed', friendlyAccountError(err, 'Try again.'));
            }
          },
        },
      ],
    );
  };

  const runSignOut = async () => {
    if (signingOut) {
      return;
    }
    const userId = user?.id;
    setSigningOut(true);

    // Push up whatever is still queued while the session is alive, but never let
    // the sync hold the sign-out hostage.
    await withTimeoutFallback(
      syncLocalAttemptEvents().catch(() => undefined),
      ATTEMPT_FLUSH_TIMEOUT_MS,
      undefined,
    );

    // End the session first: signOut() always clears this device, so the account
    // is gone even if clearing local data below hits a snag.
    await signOut();

    try {
      await clearAccountData(userId);
    } catch {
    }

    router.replace('/');
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void runSignOut(),
      },
    ]);
  };

  return (
    <SettingsScaffold title="Account">
      <SettingsSection title="Profile">
        <SettingsInfoRow label="Name" value={profile?.displayName ?? 'ScreenNudge user'} />
        <SettingsInfoRow label="Invite code" value={profile?.inviteCode ?? '-'} />
        <SettingsInfoRow label="Account" value={user ? 'Signed in' : 'Signed out'} />
        {user ? <SettingsInfoRow label="Email" value={user.email ?? 'Hidden'} /> : null}
        {user ? <SettingsInfoRow label="Sign-in" value={signInMethods} /> : null}
      </SettingsSection>

      <SettingsSection title="Actions">
        {user ? (
          <>
            <SettingsActionRow
              icon="logout"
              label={signingOut ? 'Signing out...' : 'Sign out'}
              danger
              disabled={signingOut || deleting}
              onPress={handleSignOut}
            />
            <SettingsActionRow
              icon="trash-can-outline"
              label={deleting ? 'Deleting...' : 'Delete account'}
              danger
              disabled={deleting || signingOut}
              onPress={handleDeleteAccount}
            />
          </>
        ) : (
          <SettingsActionRow
            icon="login"
            label="Sign in"
            onPress={() => router.push('/auth/sign-in')}
          />
        )}
      </SettingsSection>
    </SettingsScaffold>
  );
}
