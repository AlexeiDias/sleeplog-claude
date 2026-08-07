//components/parent/SetPasswordCard.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';

const DISMISSED_KEY = 'loggincare_password_prompt_dismissed';

/**
 * Lets a parent add a password to their existing account.
 *
 * Why this exists: iOS home-screen web apps have storage isolated from Safari,
 * and a magic link tapped in Mail always opens Safari. So a parent can never
 * complete a link sign-in *inside* the installed app — it opens signed out
 * every time. A password is the only way in that does not depend on following
 * a link.
 *
 * Magic links remain the default. This is opt-in, and only worth doing for
 * parents who want the app icon.
 */
export default function SetPasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Starts hidden and reveals itself, so it never flashes on screen for a
    // parent who already dismissed it. localStorage is unavailable during
    // server rendering, so this cannot be decided during render.
    setDismissed(Boolean(window.localStorage.getItem(DISMISSED_KEY)));
  }, []);

  if (dismissed || done) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

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
      window.localStorage.setItem(DISMISSED_KEY, '1');
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Could not set password:', err);
      setError(
        code === 'auth/requires-recent-login'
          ? 'For security, please sign in again with a fresh link, then set your password.'
          : code === 'auth/weak-password'
          ? 'That password is too weak. Please choose a longer one.'
          : 'Could not save your password. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-medium text-gray-800">Set a password</p>
          <p className="text-sm text-gray-600 mt-1">
            Only needed if you added LogginCare to your Home Screen. The app icon
            can&apos;t use email sign-in links, so a password lets you open it
            directly. Otherwise you can keep using links.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-700 text-lg leading-none shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {!open ? (
        <Button
          variant="secondary"
          className="mt-3 text-sm"
          onClick={() => setOpen(true)}
        >
          Set a password
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3">
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="flex-1"
            >
              Save password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
