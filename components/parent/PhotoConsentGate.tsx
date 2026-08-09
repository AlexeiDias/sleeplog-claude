//components/parent/PhotoConsentGate.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { fetchConsent, recordConsent } from '@/lib/photoConsent';
import Button from '@/components/Button';

/**
 * Asks once, before a parent reaches the portal, whether photos including their
 * children may be shared with other families.
 *
 * Blocking by design — an unanswered question is treated as declined, so
 * leaving it skippable would mean quietly withholding consent for families who
 * simply never got around to it. One question, once.
 */
export default function PhotoConsentGate({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const [needsAnswer, setNeedsAnswer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    if (!user.familyId) {
      setChecked(true);
      return;
    }
    try {
      const record = await fetchConsent(user.familyId);
      setNeedsAnswer(record === null);
    } catch (err) {
      // If the check itself fails, let them through rather than locking them
      // out of their child's records over a consent prompt.
      console.error('Could not check photo consent:', err);
    } finally {
      setChecked(true);
    }
  }, [user.familyId]);

  useEffect(() => {
    check();
  }, [check]);

  async function answer(allowed: boolean) {
    setSaving(true);
    setError('');
    try {
      await recordConsent(user, allowed);
      setNeedsAnswer(false);
    } catch (err) {
      console.error('Could not save photo consent:', err);
      setError('We could not save your answer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!needsAnswer) return <>{children}</>;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-xl font-bold text-blue-900 mb-1">One question first</h1>
        <p className="text-sm text-gray-600 mb-4">
          Before you get started, we need your answer about photos.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-3 mb-4">
          <p>
            Sometimes we share photos of activities with all families in the app —
            a craft table, a birthday, a morning outside. Those photos often
            include several children.
          </p>
          <p>
            <strong>
              May photos that include your child be shared with other families
              here?
            </strong>
          </p>
          <p className="text-gray-600">
            This is only about photos shared with the whole group. Photos of your
            own child sent directly to you are private either way, and your
            answer does not affect anything else in the app.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            isLoading={saving}
            onClick={() => answer(true)}
          >
            Yes, that&apos;s fine
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            isLoading={saving}
            onClick={() => answer(false)}
          >
            No, please don&apos;t
          </Button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          You can change your answer at any time under Account. If you have
          questions, please speak to us directly.
        </p>
      </div>
    </div>
  );
}
