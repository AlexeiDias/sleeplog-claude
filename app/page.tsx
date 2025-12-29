//app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Button from '@/components/Button';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-900 mb-4">
          💤 SleepLog
        </h1>
        <p className="text-xl text-blue-700 mb-8">
          Compliant Sleep Tracking for California Daycare Centers
        </p>
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Get Started
          </h2>
          <p className="text-gray-600 mb-6">
            Track infant sleep sessions and maintain compliance with California Title 22 regulations.
          </p>
          
          <div className="space-y-3">
            <Link href="/signup" className="block">
              <Button variant="primary" className="w-full">
                Create Account
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="secondary" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500">
              Built for compliance with Title 22, Section 101229
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}