//components/parent/PhotoConsentSetting.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { fetchConsent, recordConsent, ConsentRecord } from '@/lib/photoConsent';
import Button from '@/components/Button';

/** Lets a parent see and change the answer they gave when they first signed in. */
export default function PhotoConsentSetting({ user }: { user: User | null }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }
    try {
      setRecord(await fetchConsent(user.familyId));
    } catch (err) {
      console.error('Could not load photo consent:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function change(allowed: boolean) {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await recordConsent(user, allowed);
      await load();
    } catch (err) {
      console.error('Could not save photo consent:', err);
      setError('Could not save your answer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user?.familyId) return null;

  const allowed = record?.allowed === true;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-medium text-gray-800">Photos</h3>
      <p className="text-sm text-gray-600 mt-1 mb-3">
        Whether photos that include your child may be shared with other families
        in the app. Photos sent privately to you are not affected.
      </p>

      <div className="flex items-center gap-3 mb-3">
        <span
          className={`text-sm px-3 py-1 rounded-full ${
            allowed ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {allowed ? 'Sharing allowed' : 'Not shared with other families'}
        </span>
        {record && (
          <span className="text-xs text-gray-500">
            Answered by {record.answeredByName || 'you'} on{' '}
            {record.answeredAt.toLocaleDateString('en-US')}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button
        variant="secondary"
        className="text-sm"
        isLoading={saving}
        onClick={() => change(!allowed)}
      >
        {allowed ? 'Stop sharing photos with other families' : 'Allow sharing'}
      </Button>
    </div>
  );
}
