//app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import { Child } from '@/types';

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

  function calculateAge(dateOfBirth: Date): string {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}y ${months}m` : `${years} year${years !== 1 ? 's' : ''}`;
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
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-900">💤 SleepLog</h1>
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
          <h2 className="text-3xl font-bold text-gray-800">
            Children Dashboard
          </h2>
          <Button
            variant="primary"
            onClick={() => router.push('/register/family')}
          >
            + Add Family
          </Button>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Children Registered Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first family to start tracking sleep sessions
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/register/family')}
            >
              Add First Family
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div
                key={child.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {child.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {calculateAge(child.dateOfBirth)}
                    </p>
                  </div>
                  <div className="text-3xl">👶</div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">DOB:</span>{' '}
                    <span className="text-gray-800">
                      {new Date(child.dateOfBirth).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => alert('Sleep tracking coming in Phase 4!')}
                  >
                    Start Sleep
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
                  No active sleep session
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phase 3 Complete Notice */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            ✅ Phase 3 Complete!
          </h3>
          <ul className="text-green-800 space-y-1 text-sm">
            <li>✅ Daycare registration working</li>
            <li>✅ Family & children registration functional</li>
            <li>✅ Children displaying on dashboard</li>
            <li>✅ Onboarding flow complete</li>
          </ul>
          <p className="mt-4 text-sm text-green-700">
            <strong>Next:</strong> Phase 4 will add the sleep tracking features (Start, Check, Stop actions with timers)
          </p>
        </div>
      </main>
    </div>
  );
}