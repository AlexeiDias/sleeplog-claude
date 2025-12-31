//app/analytics/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import SleepAnalytics from '@/components/SleepAnalytics';
import { Child, SleepLogEntry } from '@/types';
import { exportAllChildrenToCSV } from '@/utils/csvExport';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.daycareId) {
      router.push('/register/daycare');
      return;
    }

    fetchChildren();
  }, [user, router]);

  async function fetchChildren() {
    if (!user?.daycareId) return;

    try {
      const q = query(
        collection(db, 'children'),
        where('daycareId', '==', user.daycareId)
      );
      const snapshot = await getDocs(q);
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Child[];

      setChildren(childrenData);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleExportCSV() {
    if (children.length === 0) {
      alert('No children data to export');
      return;
    }

    setExporting(true);

    try {
      // Get last 7 days of data for all children
      const allData: Array<{ child: Child; entries: SleepLogEntry[] }> = [];
      const today = new Date();

      for (const child of children) {
        const childEntries: SleepLogEntry[] = [];

        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const logsRef = collection(db, 'children', child.id, 'sleepLogs', dateStr, 'entries');
          const snapshot = await getDocs(logsRef);

          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          })) as SleepLogEntry[];

          childEntries.push(...entries);
        }

        if (childEntries.length > 0) {
          allData.push({ child, entries: childEntries });
        }
      }

      if (allData.length === 0) {
        alert('No sleep data found in the last 7 days');
        return;
      }

      // Export to CSV
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      const dateRange = `${startDate.toISOString().split('T')[0]}_to_${today.toISOString().split('T')[0]}`;
      
      exportAllChildrenToCSV(allData, dateRange);
      alert('CSV exported successfully!');

    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold text-blue-900 cursor-pointer">💤 SleepLog</h1>
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link href="/staff" className="text-gray-600 hover:text-gray-900">
                  Staff
                </Link>
              )}
              <Link href="/reports" className="text-gray-600 hover:text-gray-900">
                Reports
              </Link>
              <Link href="/analytics" className="text-blue-600 font-medium">
                Analytics
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {user.role.toUpperCase()}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Sleep Analytics</h2>
            <p className="text-gray-600 mt-1">Weekly trends and statistics</p>
          </div>
          <Button variant="secondary" onClick={handleExportCSV} isLoading={exporting}>
            📥 Export CSV (7 Days)
          </Button>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Children Registered
            </h3>
            <p className="text-gray-600 mb-6">
              Add families to start viewing analytics
            </p>
            {user.role === 'admin' && (
              <Button
                variant="primary"
                onClick={() => router.push('/register/family')}
              >
                Add First Family
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {children.map((child) => (
              <SleepAnalytics key={child.id} child={child} />
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 About Analytics</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Shows sleep data for the last 7 days</li>
            <li>• Average daily sleep excludes days with no sleep logs</li>
            <li>• Charts update automatically as new sleep logs are added</li>
            <li>• Export feature allows downloading all data as CSV</li>
          </ul>
        </div>
      </main>
    </div>
  );
}