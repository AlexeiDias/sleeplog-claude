//app/profile/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [initials, setInitials] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.initials) {
      setInitials(user.initials);
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!initials.trim()) {
      setError('Please enter your initials');
      return;
    }

    if (initials.length > 5) {
      setError('Initials should be 5 characters or less');
      return;
    }

    setIsLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      await setDoc(
        doc(db, 'users', user.uid),
        { initials: initials.trim().toUpperCase() },
        { merge: true }
      );

      await refreshUser();
      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating initials:', err);
      setError('Failed to update initials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Set Your Initials ✍️
            </h1>
            <p className="text-gray-600">
              Your initials will be used to document sleep checks
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              Initials saved successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Initials (e.g., JD)"
              type="text"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              required
              maxLength={5}
              placeholder="JD"
              className="uppercase"
            />

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Note:</strong> Initials are required for compliance documentation. They will appear on all sleep check records you create.
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                Save Initials
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}