//app/parent/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Routes under /parent that must stay reachable while signed out, otherwise the
// guard below would bounce parents away from the very pages that sign them in.
const PUBLIC_PARENT_ROUTES = ['/parent/login', '/parent/finish'];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_PARENT_ROUTES.includes(pathname);

  useEffect(() => {
    if (isPublicRoute) return;

    // Always wait for auth to resolve before redirecting, or a signed-in parent
    // gets bounced to login on every refresh.
    if (authLoading) return;

    if (!user) {
      router.replace('/parent/login');
      return;
    }

    if (user.role !== 'parent') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isPublicRoute]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (authLoading || !user || user.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/parent/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-900">LogginCare</h1>
            <p className="text-xs text-gray-500">Parent portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
