//components/parent/ParentShell.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import Button from '@/components/Button';
import { useParentUnread } from '@/components/messaging/useUnreadMessages';
import PhotoConsentGate from '@/components/parent/PhotoConsentGate';
import ChildStrip from '@/components/parent/ChildStrip';

// Routes under /parent that must stay reachable while signed out, otherwise the
// guard below would bounce parents away from the very pages that sign them in.
const PUBLIC_PARENT_ROUTES = ['/parent/login', '/parent/finish'];

export default function ParentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasUnread = useParentUnread(user?.familyId);

  const isPublicRoute = PUBLIC_PARENT_ROUTES.includes(pathname);

  // Signed in to Firebase but with no user profile — which is what revocation
  // leaves behind, since it deletes the document and not the login.
  //
  // But it is also what a brand new parent looks like for a moment: the profile
  // is created during sign-in, after AuthContext has already looked for it and
  // found nothing. Declaring access removed immediately would greet a parent
  // who just signed in successfully with a message saying they were revoked.
  // So re-check once before believing it.
  const missingProfile = !authLoading && !user && Boolean(auth.currentUser);
  const [recheckDone, setRecheckDone] = useState(false);
  const accessRemoved = missingProfile && recheckDone;

  useEffect(() => {
    if (!missingProfile || recheckDone) return;

    let cancelled = false;
    refreshUser()
      .catch((err) => console.error('Profile re-check failed:', err))
      .finally(() => {
        if (!cancelled) setRecheckDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [missingProfile, recheckDone, refreshUser]);

  useEffect(() => {
    if (isPublicRoute) return;

    // Always wait for auth to resolve before redirecting, or a signed-in parent
    // gets bounced to login on every refresh.
    if (authLoading) return;
    if (accessRemoved) return;

    if (!user) {
      router.replace('/parent/login');
      return;
    }

    if (user.role !== 'parent') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isPublicRoute, accessRemoved]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (accessRemoved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">LogginCare</h1>
          <p className="text-gray-800 font-medium mb-2">
            Your access has been removed
          </p>
          <p className="text-sm text-gray-600 mb-6">
            This portal is no longer available for your account. If you think
            this is a mistake, please contact your daycare directly.
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await logout();
              router.replace('/parent/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
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
    <PhotoConsentGate user={user}>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-900">LogginCare</h1>
            <p className="text-xs text-gray-500">Parent portal</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Always reachable, unlike the dismissible prompt on Today — a
                parent who dismissed it still needs somewhere to set or change
                a password. */}
            <Link
              href="/parent/account"
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Account
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <ChildStrip familyId={user.familyId} />

      <nav className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {[
            { href: '/parent', label: 'Dashboard', dot: false },
            { href: '/parent/sleep', label: 'Sleep stats', dot: false },
            { href: '/parent/messages', label: 'Messages', dot: hasUnread },
            { href: '/parent/media', label: 'Photos', dot: false },
          ].map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.dot && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-blue-600 ml-1.5 align-super"
                    aria-label="New messages"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
    </PhotoConsentGate>
  );
}
