//app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import ChildCard from '@/components/ChildCard';
import Navbar from '@/components/Navbar';
import { Child } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to calculate age in months
  function getAgeInMonths(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    return months;
  }

  // Helper function to check if child needs sleep tracking (under 24 months)
  // Used for California compliance indicator
  function needsSleepTracking(child: Child): boolean {
    return getAgeInMonths(child.dateOfBirth) < 24;
  }

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

    // Listen to children in real-time
    if (!user?.daycareId) return;

    const q = query(
      collection(db, 'children'),
      where('daycareId', '==', user.daycareId)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Child[];

      // Sort children by age (youngest first)
      childrenData.sort((a, b) => {
        const ageA = getAgeInMonths(a.dateOfBirth);
        const ageB = getAgeInMonths(b.dateOfBirth);
        return ageA - ageB;
      });

      setChildren(childrenData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching children:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user, router]);

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

  // Count children under 2 for compliance info
  const childrenUnder2 = children.filter(needsSleepTracking);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <Navbar />

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

        {/* California Compliance Info */}
        {childrenUnder2.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3">📋</span>
              <div>
                <h3 className="font-semibold text-blue-900">California Title 22 Compliance</h3>
                <p className="text-sm text-blue-800">
                  {childrenUnder2.length} {childrenUnder2.length === 1 ? 'child' : 'children'} under 2 years old require sleep tracking documentation.
                  Sleep logs are available for all children.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Children Grid - Show ALL children */}
        {children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Children Registered
            </h3>
            <p className="text-gray-600 mb-6">
              {user.role === 'admin' 
                ? 'Add your first family to start tracking sleep and care logs'
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

        {/* Quick Links Card - Admin Only */}
        {user.role === 'admin' && children.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🔗 Quick Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Kiosk Setup */}
              <Link
                href="/kiosk-setup"
                className="block p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 transition-all group"
              >
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-3">🖥️</span>
                  <h4 className="text-lg font-semibold text-purple-900">Kiosk Setup</h4>
                </div>
                <p className="text-sm text-purple-700">
                  Configure tablet for parent sign-in/out at entrance
                </p>
                <p className="text-xs text-purple-600 mt-2 group-hover:underline">
                  Set up kiosk →
                </p>
              </Link>

              {/* Sign-In/Out Records */}
              <Link
                href="/reports/sign-in-out"
                className="block p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all group"
              >
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-3">📋</span>
                  <h4 className="text-lg font-semibold text-blue-900">Sign-In/Out Records</h4>
                </div>
                <p className="text-sm text-blue-700">
                  View, print, and export parent signature records
                </p>
                <p className="text-xs text-blue-600 mt-2 group-hover:underline">
                  View records →
                </p>
              </Link>

              {/* Daily Reports */}
              <Link
                href="/reports"
                className="block p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border border-green-200 transition-all group"
              >
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-3">📊</span>
                  <h4 className="text-lg font-semibold text-green-900">Daily Reports</h4>
                </div>
                <p className="text-sm text-green-700">
                  Generate and email daily sleep & care logs to parents
                </p>
                <p className="text-xs text-green-600 mt-2 group-hover:underline">
                  Create reports →
                </p>
              </Link>
            </div>

            {/* Direct Kiosk Link */}
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-2xl mr-3">💡</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    Tablet Kiosk URL
                  </h4>
                  <p className="text-sm text-yellow-800 mb-2">
                    Bookmark this on your entrance tablet:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-yellow-300 text-sm font-mono text-yellow-900 overflow-x-auto">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://sleeplog-claude.vercel.app'}/sign-in
                    </code>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const url = `${window.location.origin}/sign-in`;
                          navigator.clipboard.writeText(url);
                          alert('URL copied to clipboard!');
                        }
                      }}
                      className="px-3 py-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded text-sm font-medium whitespace-nowrap"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Complete Notice */}
        {user.initials && children.length > 0 && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✅ All Features Active!
            </h3>
            <ul className="text-green-800 space-y-1 text-sm">
              <li>✅ Sleep tracking with timers (all ages)</li>
              <li>✅ Care logs - Diapers, Meals, Bottles</li>
              <li>✅ Email & print reports</li>
              <li>✅ California compliance documentation</li>
              <li>✅ Electronic sign-in/out with signatures</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
