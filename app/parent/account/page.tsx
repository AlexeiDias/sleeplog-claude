//app/parent/account/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PhotoConsentSetting from '@/components/parent/PhotoConsentSetting';

/**
 * Always-available place to set or change a password.
 *
 * The prompt on the Today page is dismissible and disappears once used, which
 * left a parent who dismissed it — or who wants to change an existing password
 * — with nowhere to go. This page is that somewhere.
 */
export default function ParentAccountPage() {
  const { user, refreshUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (password.length < 8) {
      setError('Please use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (!auth.currentUser) {
      setError('You appear to be signed out. Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(auth.currentUser, password);

      // Same flag the Today prompt reads, so setting a password here also
      // stops it reappearing in the Home Screen app.
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        { hasPassword: true },
        { merge: true }
      );
      await refreshUser();

      setSaved(true);
      setPassword('');
      setConfirm('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Could not set password:', err);
      setError(
        code === 'auth/requires-recent-login'
          ? 'For security, Firebase needs a fresh sign-in before changing a password. Sign out, sign back in with an email link, then try again.'
          : code === 'auth/weak-password'
          ? 'That password is too weak. Please choose a longer one.'
          : 'Could not save your password. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-800">Account</h2>
        <p className="text-sm text-gray-600 mt-1">
          Signed in as <strong>{user?.email}</strong>
        </p>
      </div>

      <PhotoConsentSetting user={user} />

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-gray-800">Password</h3>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          You don&apos;t need a password to use LogginCare in your browser — an
          email link is enough. A password is only needed if you added the app to
          your Home Screen, because the app icon can&apos;t open email links.
          Setting one here also replaces an existing password.
        </p>

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Password saved. You can now sign in with it from the app icon.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" isLoading={saving} className="w-full">
            Save password
          </Button>
        </form>
      </div>

      <p className="text-xs text-gray-500 text-center px-4">
        Forgotten your password? You don&apos;t need it — sign out and request an
        email sign-in link instead, then set a new one here.
      </p>
    </div>
  );
}
