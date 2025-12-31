//app/reports/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import HistoricalChildCard from '@/components/HistoricalChildCard';
import { Child } from '@/types';
import Link from 'next/link';

export default function ReportsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

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
              <Link href="/reports" className="text-blue-600 font-medium">
                Reports
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
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Historical Reports</h2>
          
          {/* Date Picker */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              label="View Reports For"
            />
            
            {isToday && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <strong>💡 Tip:</strong> You're viewing today's data. For live tracking, go to the{' '}
                <Link href="/dashboard" className="underline font-medium">
                  Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Children Registered
            </h3>
            <p className="text-gray-600 mb-6">
              Add families to start viewing sleep reports
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {children.map((child) => (
              <HistoricalChildCard
                key={child.id}
                child={child}
                selectedDate={selectedDate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}