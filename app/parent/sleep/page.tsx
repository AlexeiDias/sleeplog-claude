//app/parent/sleep/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import SleepAnalytics from '@/components/SleepAnalytics';
import { Child } from '@/types';
import { toDate } from '@/lib/messaging';

export default function ParentSleepPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const snapshot = await getDocs(query(
        collection(db, 'children'),
        where('familyId', '==', user.familyId)
      ));

      setChildren(
        snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
            dateOfBirth: toDate(d.data().dateOfBirth),
            createdAt: toDate(d.data().createdAt),
          }))
          .filter((child) => !(child as Child).archived) as Child[]
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error loading children for sleep stats:', err);
      setError(`Could not load sleep information.${code ? ` (${code})` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-800">Sleep</h2>
        <p className="text-sm text-gray-600">
          The last seven days, from the naps staff logged at the daycare.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            No children are linked to your account yet. Please contact your daycare.
          </p>
        </div>
      ) : (
        // Deliberately the same component the daycare uses, so a parent and
        // staff member looking at the same child always see the same numbers.
        children.map((child) => <SleepAnalytics key={child.id} child={child} />)
      )}

      <p className="text-xs text-gray-500 text-center px-4">
        These figures come from nap records logged by staff. Sleep at home is not
        included. If something looks wrong, please contact your daycare.
      </p>
    </div>
  );
}
