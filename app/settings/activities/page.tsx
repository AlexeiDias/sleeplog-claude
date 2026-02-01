//app/settings/activities/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ActivityCategoryManager from '@/components/ActivityCategoryManager';

export default function ActivitySettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Only admins can access this page
    if (user.role !== 'admin') {
      router.push('/settings');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user.daycareId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">Please set up your daycare first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <ActivityCategoryManager daycareId={user.daycareId} />
    </div>
  );
}
