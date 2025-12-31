//app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import ChildCard from '@/components/ChildCard';
import { Child } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect to daycare registration if no daycare
    if (user && !user.daycareId) {
      router.push('/register/daycare');
      return;
    }

    // Fetch children
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

    fetchChildren();
  }, [user, router]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-900">💤 SleepLog</h1>
              {user.role === 'admin' && (
                <Link href="/staff" className="text-gray-600 hover:text-gray-900">
                  Staff
                </Link>
              )}
              <Link href="/reports" className="text-gray-600 hover:text-gray-900">
                Reports
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
                {user.initials && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {user.initials}
                  </span>
                )}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {user.role.toUpperCase()}
              </span>
              {!user.initials && (
                <Link href="/profile">
                  <Button variant="primary" className="text-xs">
                    Set Initials
                  </Button>
                </Link>
              )}
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user.initials && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-900">Initials Required</h3>
                <p className="text-sm text-yellow-800">
                  You need to set your initials before you can track sleep sessions.{' '}
                  <Link href="/profile" className="underline font-medium">
                    Set them now
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">
            Children Dashboard
          </h2>
          {user.role === 'admin' && (
            <Button
              variant="primary"
              onClick={() => router.push('/register/family')}
            >
              + Add Family
            </Button>
          )}
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Children Registered Yet
            </h3>
            <p className="text-gray-600 mb-6">
              {user.role === 'admin' 
                ? 'Add your first family to start tracking sleep sessions'
                : 'No children have been added to this daycare yet'}
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
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}

        {/* Phase 5 Complete Notice */}
        {user.initials && children.length > 0 && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✅ All Phases Complete!
            </h3>
            <ul className="text-green-800 space-y-1 text-sm">
              <li>✅ Authentication & user management</li>
              <li>✅ Daycare & family registration</li>
              <li>✅ Sleep tracking with timers</li>
              <li>✅ Real-time logs & Firestore sync</li>
              <li>✅ Email & print reports</li>
              <li>✅ Full compliance documentation</li>
            </ul>
            <p className="mt-4 text-sm text-green-700">
              <strong>🎉 Your SleepLog app is fully functional!</strong>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}