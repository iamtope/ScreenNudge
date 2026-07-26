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
import { friendlyAccountError } from '@/src/lib/network';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, profile } = useSession();
  const { reset: resetOnboarding } = useOnboarding();
  const { setPullPlus } = useAccess();
  const [deleting, setDeleting] = useState(false);

  // Screen Time selection, Pull+ entitlement, guarded apps and the local stats cache
  // live on-device. Wipe them on sign-out / deletion so the next user — or a guest —
  // never inherits the previous user's protection, plan, or local history.
  const resetDeviceData = async () => {
    clearProtectionState();
    setPullPlus(false);
    resetOnboarding();
    await Promise.all([clearProtectionSnapshot(), clearAttempts()]);
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
            setDeleting(true);
            try {
              await deleteAccount();
              await resetDeviceData();
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

  const handleSignOut = async () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await syncLocalAttemptEvents();
            await resetDeviceData();
            await signOut();
            router.replace('/');
          } catch (err) {
            Alert.alert('Sign out failed', friendlyAccountError(err, 'Try again.'));
          }
        },
      },
    ]);
  };

  return (
    <SettingsScaffold title="Account">
      <SettingsSection title="Profile">
        <SettingsInfoRow label="Name" value={profile?.displayName ?? 'Pull user'} />
        <SettingsInfoRow label="Invite code" value={profile?.inviteCode ?? '-'} />
        <SettingsInfoRow label="Account" value={user ? 'Signed in' : 'Signed out'} />
      </SettingsSection>

      <SettingsSection title="Actions">
        {user ? (
          <>
            <SettingsActionRow
              icon="logout"
              label="Sign out"
              danger
              onPress={() => void handleSignOut()}
            />
            <SettingsActionRow
              icon="trash-can-outline"
              label={deleting ? 'Deleting...' : 'Delete account'}
              danger
              disabled={deleting}
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
