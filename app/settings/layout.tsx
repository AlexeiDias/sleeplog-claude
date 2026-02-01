//app/settings/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useEffect } from 'react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navigation Bar */}
      <Navbar />

      {/* Settings Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Settings</h2>
              <nav className="space-y-2">
                <Link
                  href="/settings"
                  className={`block px-4 py-2 rounded transition ${
                    isActive('/settings')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Profile
                </Link>
                {user.role === 'admin' && (
                  <>
                    <Link
                      href="/settings/daycare"
                      className={`block px-4 py-2 rounded transition ${
                        isActive('/settings/daycare')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Daycare Info
                    </Link>
                    <Link
                      href="/settings/families"
                      className={`block px-4 py-2 rounded transition ${
                        isActive('/settings/families')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Families & Children
                    </Link>
                    <Link
                      href="/settings/activities"
                      className={`block px-4 py-2 rounded transition ${
                        isActive('/settings/activities')
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      🎨 Activity Categories
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
